import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { LiveMoment } from "./talkRoom";
import {
  AUDIENCE_CHANNEL,
  FRIDGE_REREAD_MS,
  SEAT_CHANNEL,
  STAGE_CHANNEL,
  fridgeWords,
  answers as answersChannel,
  MAX_HIDDEN_SENT,
  talkEvent,
  type Answers,
  circleLoops,
  playhtml,
  type AudiencePresence,
  type Fridge,
  type Loops,
  type SeatPresence,
  type StagePresence,
} from "./talkRoom";
import { parseAnswers, parseAudience, parseFridge, parseLoops, parseSeat } from "./roomData";
import { SEATS } from "./seats";
import { answerBox, newAnswerLayout, placeAnswers, type AnswerLayout, type Measure } from "./answerLayout";
import { CURSOR_TIP, PlayCursor } from "./PlayCursor";
import { FridgeDoor } from "./FridgeDoor";

// What the audience adds on top of the slide on the big screen. Drawn in
// slide pixels (1920x1080) over the current slide; the deck never waits on it.

const W = 1920;
const H = 1080;

/** Everyone's phone in the room, by presence id. */
function useAudience(ready: boolean) {
  const [audience, setAudience] = useState<Map<string, AudiencePresence>>(new Map());
  useEffect(() => {
    if (!ready) return;
    // Many phones change at once; the stage redraws at most once a frame.
    let frame: number | null = null;
    const read = () => {
      frame = null;
      const next = new Map<string, AudiencePresence>();
      for (const [id, view] of playhtml.presence.getPresences()) {
        const value = parseAudience(view[AUDIENCE_CHANNEL]);
        if (value) next.set(id, value);
      }
      setAudience(next);
    };
    read();
    const off = playhtml.presence.onPresenceChange(AUDIENCE_CHANNEL, () => {
      frame ??= requestAnimationFrame(read);
    });
    return () => {
      off();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ready]);
  return audience;
}

/** Everyone's cursor on the benches slide, by presence id. */
function useSeats(ready: boolean, on: boolean) {
  const [seats, setSeats] = useState<Map<string, SeatPresence>>(new Map());
  useEffect(() => {
    if (!ready || !on) return;
    let frame: number | null = null;
    const read = () => {
      frame = null;
      const next = new Map<string, SeatPresence>();
      for (const [id, view] of playhtml.presence.getPresences()) {
        const value = parseSeat(view[SEAT_CHANNEL]);
        if (value) next.set(id, value);
      }
      setSeats(next);
    };
    read();
    const off = playhtml.presence.onPresenceChange(SEAT_CHANNEL, () => {
      frame ??= requestAnimationFrame(read);
    });
    return () => {
      off();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ready, on]);
  return seats;
}

/** The fridge words people have moved. */
function useAnswers(ready: boolean, on: boolean) {
  const [shown, setShown] = useState<Answers>({});
  useEffect(() => {
    if (!ready || !on) return;
    const channel = answersChannel();
    let frame: number | null = null;
    const read = () => {
      frame = null;
      setShown(parseAnswers(channel.getData()));
    };
    read();
    const off = channel.onUpdate(() => {
      frame ??= requestAnimationFrame(read);
    });
    // Same gap in playhtml as the fridge: the first change in a new room
    // can go unreported, so re-read now and then.
    const reread = setInterval(read, FRIDGE_REREAD_MS);
    return () => {
      off();
      clearInterval(reread);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ready, on]);
  return shown;
}

/** A loop as an SVG path on the slide: the phone's pad is the slide on its side. */
function loopPath(points: number[]): string {
  let d = "";
  for (let i = 0; i + 1 < points.length; i += 2) {
    const x = ((1 - points[i + 1]) / 2) * W;
    const y = ((1 + points[i]) / 2) * H;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d;
}

/** Spencer's colour, for the slide's own words among the room's. */
const PRESENTER_COLOR = "#ffae00";
const SLIDE_WISHES = ["fun", "caring", "creative"];
/** The most wishes placed on the finale, and the most patina marks. */
const FINALE_WISHES = 34;
const FINALE_MARKS = 120;
// Places for wishes around the edges of the finale, clear of the title.
const FINALE_SLOTS: [number, number][] = [];
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 6; col++) {
    const x = 90 + col * 300;
    const y = 120 + row * 130;
    if (x > 380 && x < 1300 && y > 360 && y < 680) continue;
    FINALE_SLOTS.push([x, y]);
  }
}

/** One loop, redrawn only when it has grown (parseLoops keeps unchanged loops the same). */
const LoopPath = memo(function LoopPath({ loop }: { loop: Loops[string] }) {
  return <path d={loopPath(loop.points)} stroke={loop.color} />;
});

/**
 * The finale: everything the room made, over the slide as it is. Every loop,
 * a soft mark where each person first drew (the room's patina), and the
 * wishes around the edges, each faintly underlined in its person's colour.
 * The title stays clear in the middle.
 */
function RoomMarks({ loops, answers, hidden }: { loops: Loops; answers: Answers; hidden: ReadonlySet<string> }) {
  const seen = new Set<string>();
  const wishes = Object.entries(answers)
    .filter(([key, a]) => a.kind === "wish" && !hidden.has(key))
    .sort(([a], [b]) => hashOf(a) - hashOf(b))
    .filter(([, a]) => {
      const text = a.text.toLowerCase();
      if (seen.has(text)) return false;
      seen.add(text);
      return true;
    });
  const words: [string, string, string][] = [
    ...SLIDE_WISHES.map((w): [string, string, string] => [`slide:${w}`, w, PRESENTER_COLOR]),
    ...wishes.slice(0, FINALE_WISHES - SLIDE_WISHES.length).map(([key, a]): [string, string, string] => [key, a.text, a.color]),
  ].slice(0, FINALE_SLOTS.length);
  const loopList = Object.entries(loops);
  const firstLoops = new Map<string, Loops[string]>();
  for (const [key, loop] of loopList) {
    const person = key.split(":")[0];
    if (!firstLoops.has(person) && firstLoops.size < FINALE_MARKS) firstLoops.set(person, loop);
  }
  const density = loopList.length > 300 ? "dense" : loopList.length > 80 ? "busy" : undefined;
  return (
    <div className="talk-room-marks" data-density={density}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        {[...firstLoops].map(([person, loop]) => (
          <circle
            key={person}
            cx={((1 - loop.points[1]) / 2) * W}
            cy={((1 + loop.points[0]) / 2) * H}
            r={110}
            fill={loop.color}
            opacity={0.22}
            style={{ filter: "blur(40px)" }}
          />
        ))}
        {loopList.map(([key, loop]) => (
          <LoopPath key={key} loop={loop} />
        ))}
      </svg>
      {words.map(([key, text, color], i) => {
        const [x, y] = FINALE_SLOTS[(i * 11) % FINALE_SLOTS.length];
        const h = hashOf(key);
        return (
          <span
            key={key}
            className="talk-room-marks__word"
            style={{
              left: x + (h % 60) - 30,
              top: y + ((h >> 5) % 40) - 20,
              transform: `rotate(${((h >> 3) % 7) - 3}deg)`,
              ["--mover" as string]: color,
            }}
          >
            {text}
          </span>
        );
      })}
      <div className="talk-room-marks__title">Play Together</div>
    </div>
  );
}

/** A stable small number from a string, to scatter answers the same way on every screen. */
function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Wishes are measured in the stage's own font, so each card's box (and the
// spots in answerLayout.ts) match what is drawn.
const ANSWER_FONT = '"Vulf Sans", sans-serif';
let measureContext: CanvasRenderingContext2D | null = null;
const measured = new Map<string, number>();
const measureAnswer: Measure = (text, size) => {
  const key = `${size}|${text}`;
  const known = measured.get(key);
  if (known !== undefined) return known;
  measureContext ??= document.createElement("canvas").getContext("2d");
  if (!measureContext) throw new Error("[talk] no 2d canvas to measure wishes with");
  measureContext.font = `${size}px ${ANSWER_FONT}`;
  const width = measureContext.measureText(text).width;
  measured.set(key, width);
  return width;
};

/** True once the stage's font is in, so wishes are measured in it. */
function useAnswerFont() {
  const [ready, setReady] = useState(() => document.fonts.check(`34px ${ANSWER_FONT}`));
  useEffect(() => {
    if (ready) return;
    let alive = true;
    document.fonts.load(`34px ${ANSWER_FONT}`).then(
      () => alive && setReady(true),
      (error: unknown) => {
        console.warn("[talk] the wish font did not load; measuring with the fallback", error);
        if (alive) setReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [ready]);
  return ready;
}

/**
 * Wishes from the room, over a veil on the slide. Every wish is shown: each
 * keeps the spot it got when it arrived (see answerLayout.ts), and when the
 * slide fills they all shrink together around their own spots.
 */
function AnswerCloud({ answers, kind, hidden }: { answers: Answers; kind: "wish"; hidden: ReadonlySet<string> }) {
  const fontReady = useAnswerFont();
  const layout = useRef<AnswerLayout>(newAnswerLayout());
  const list = Object.entries(answers)
    .filter(([key, a]) => a.kind === kind && !hidden.has(key))
    .sort(([, a], [, b]) => a.at - b.at);
  if (list.length === 0 || !fontReady) return null;
  placeAnswers(
    list.map(([key, a]) => ({ key, text: a.text })),
    layout.current,
    measureAnswer,
  );
  const size = layout.current.size;
  return (
    <>
      <div className="talk-live__veil" />
      {list.map(([key, answer]) => {
        const box = answerBox(key, layout.current, measureAnswer);
        if (!box) return null;
        const h = hashOf(key);
        return (
          <span
            key={key}
            className="talk-live__answer"
            style={{
              left: box.x,
              top: box.y,
              width: box.w,
              fontSize: size,
              transform: `rotate(${((h >> 3) % 7) - 3}deg)`,
              ["--mover" as string]: answer.color,
            }}
          >
            {answer.text}
          </span>
        );
      })}
    </>
  );
}

function useFridge(ready: boolean, on: boolean) {
  const [words, setWords] = useState<Fridge>({});
  useEffect(() => {
    if (!ready || !on) return;
    const channel = fridgeWords();
    let frame: number | null = null;
    const read = () => {
      frame = null;
      setWords(parseFridge(channel.getData()));
    };
    read();
    const off = channel.onUpdate(() => {
      frame ??= requestAnimationFrame(read);
    });
    const reread = setInterval(read, FRIDGE_REREAD_MS);
    return () => {
      off();
      clearInterval(reread);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ready, on]);
  return words;
}

function useLoops(ready: boolean, on: boolean) {
  const [loops, setLoops] = useState<Loops>({});
  useEffect(() => {
    if (!ready || !on) return;
    const channel = circleLoops();
    // Loops grow while people draw, so updates come often; redraw once a frame,
    // and only re-check the loops that grew.
    let frame: number | null = null;
    let last: Loops = {};
    const read = () => {
      frame = null;
      last = parseLoops(channel.getData(), last);
      setLoops(last);
    };
    read();
    const off = channel.onUpdate(() => {
      frame ??= requestAnimationFrame(read);
    });
    return () => {
      off();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ready, on]);
  return loops;
}

type Mark = { x: number; y: number; color: string };
/** The most fingers drawn at once; past this the room is a sea of colour anyway. */
const MAX_GLOWS = 150;
/** The most cursors on the benches slide. */
const MAX_SEATED = 150;
/** How long a lifted finger takes to fade (talk-glow-out in talk.scss). */
const GLOW_FADE_MS = 650;

function Glows({ audience }: { audience: Map<string, AudiencePresence> }) {
  // Fingers that just lifted, kept a moment so they fade where they were.
  const [lifted, setLifted] = useState<Map<string, Mark>>(new Map());
  const down = useRef(new Map<string, Mark>());
  useEffect(() => {
    const now = new Map<string, Mark>();
    for (const [id, person] of audience) {
      if (person.touch) now.set(id, { x: person.touch.x, y: person.touch.y, color: person.color });
    }
    const gone = [...down.current].filter(([id]) => !now.has(id));
    down.current = now;
    if (gone.length === 0) return;
    setLifted((marks) => new Map([...marks, ...gone]));
    // Not cleared on the next change: every lifted mark must leave on time.
    setTimeout(() => {
      setLifted((marks) => {
        const next = new Map(marks);
        for (const [id] of gone) next.delete(id);
        return next;
      });
    }, GLOW_FADE_MS);
  }, [audience]);

  const glow = (key: string, mark: Mark, fading: boolean) => (
    <span
      key={key}
      className="talk-live__glow"
      data-lifted={fading || undefined}
      style={{ left: mark.x * W, top: mark.y * H, ["--glow" as string]: mark.color }}
    />
  );
  return (
    <>
      {[...audience]
        .filter(([, person]) => person.touch)
        .slice(0, MAX_GLOWS)
        .map(([id, person]) => glow(id, { x: person.touch!.x, y: person.touch!.y, color: person.color }, false))}
      {[...lifted].map(([id, mark]) => (audience.get(id)?.touch ? null : glow(`${id}:lifted`, mark, true)))}
    </>
  );
}

const JOIN_QR = "/talk/perpetual-play/join-qr.svg";
const NAME_STAMP = "/assets/name-stamp.png";

/** The QR and link to join; `here` adds the count of people in the room. */
export function JoinCard({ here }: { here?: AudiencePresence[] }) {
  return (
    <>
      <div className="talk-live__qr">
        <img src={JOIN_QR} alt="QR code for spencer.place/talk" />
        <img className="talk-live__stamp" src={NAME_STAMP} alt="" />
      </div>
      <div className="talk-live__label">
        <span>join on your phone</span>
        <span className="talk-live__link">spencer.place/talk</span>
      </div>
      {here && (
        <div className="talk-live__here">
          <span className="talk-live__dots">
            {here.slice(0, 40).map((person, i) => (
              <span key={i} style={{ ["--glow" as string]: person.color }} />
            ))}
          </span>
          {here.length} here
        </div>
      )}
    </>
  );
}

/**
 * Everyone's loops over the video of the circle being drawn. A phone's pad is the slide turned on its
 * side, so each point is turned back: the pad's top is the slide's right.
 */
function CircleLoops({ loops }: { loops: Loops }) {
  return (
    <svg className="talk-live__loops" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {Object.entries(loops).map(([key, loop]) => (
        <LoopPath key={key} loop={loop} />
      ))}
    </svg>
  );
}

const CURSOR = 64;

/**
 * Everyone's cursor over the benches. A cursor that has sat down settles on
 * its seat, tips back a little and casts a shadow; others wander.
 */
function SeatedCursors({
  seats,
  audience,
  build,
}: {
  seats: Map<string, SeatPresence>;
  audience: Map<string, AudiencePresence>;
  build: number;
}) {
  // Two people on one seat (both let go at once) sit side by side.
  const onSeat = new Map<number, number>();
  return (
    <>
      {[...seats].slice(0, MAX_SEATED).map(([id, cursor]) => {
        const color = audience.get(id)?.color;
        if (!color) return null;
        const seat =
          cursor.sitting && cursor.seat !== null && SEATS[cursor.seat].build <= build ? SEATS[cursor.seat] : null;
        let x = cursor.x * W;
        let y = cursor.y * H;
        if (seat && cursor.seat !== null) {
          const nth = onSeat.get(cursor.seat) ?? 0;
          onSeat.set(cursor.seat, nth + 1);
          x = seat.x * W + nth * 26;
          y = seat.y * H;
        }
        return (
          <span
            key={id}
            className="talk-live__cursor"
            data-seated={cursor.sitting || undefined}
            style={{ transform: `translate(${x - CURSOR_TIP.x * CURSOR}px, ${y - CURSOR_TIP.y * CURSOR}px)` }}
          >
            <span className="talk-live__cursor-body">
              <PlayCursor color={color} size={CURSOR} />
            </span>
          </span>
        );
      })}
    </>
  );
}

export function LiveLayer({
  ready,
  slide,
  build,
  moment,
  fridgeDoor,
  joinShown,
  roomMarks,
  hideRequests,
  presenting,
  joinOpen,
  cue,
}: {
  ready: boolean;
  slide: number;
  build: number;
  moment: LiveMoment | null;
  fridgeDoor: boolean;
  // The join slide's build that brings up the join card and fades the slide.
  joinShown: boolean;
  // The finale: everyone's loops, marks and wishes over the slide.
  roomMarks: boolean;
  // Goes up by one each time the presenter presses h.
  hideRequests: number;
  presenting: boolean;
  joinOpen: boolean;
  // Each press of m that starts something; phones flash when it rises.
  cue: number;
}) {
  const audience = useAudience(ready);
  const loops = useLoops(ready, moment === "circle" || roomMarks);
  const seats = useSeats(ready, moment === "seat");
  const fridge = useFridge(ready, fridgeDoor);
  const answerKind = moment === "wish" ? moment : null;
  const shownAnswers = useAnswers(ready, answerKind !== null || roomMarks);

  // h hides the newest answer of the moment on screen. The hidden list lives
  // on this laptop only (kept across reloads), so phones cannot undo it.
  const hiddenKey = `talk:hidden-answers:${talkEvent()}`;
  const [hiddenAnswers, setHiddenAnswers] = useState<ReadonlySet<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(hiddenKey) ?? "[]") as string[]);
    } catch (error) {
      console.warn("[talk] could not read the hidden answers", error);
      return new Set();
    }
  });
  const handledHides = useRef(hideRequests);
  useEffect(() => {
    if (hideRequests === handledHides.current) return;
    handledHides.current = hideRequests;
    if (!answerKind) return;
    const newest = Object.entries(shownAnswers)
      .filter(([key, a]) => a.kind === answerKind && !hiddenAnswers.has(key))
      .sort(([, a], [, b]) => b.at - a.at)[0];
    if (!newest) return;
    const next = new Set(hiddenAnswers).add(newest[0]);
    setHiddenAnswers(next);
    try {
      localStorage.setItem(hiddenKey, JSON.stringify([...next]));
    } catch (error) {
      console.warn("[talk] could not remember the hidden answers", error);
    }
  }, [hideRequests, answerKind, shownAnswers, hiddenAnswers, hiddenKey]);

  // Phones follow only a stage that has been switched to presenting, so
  // someone else opening /talk/stage cannot drive the room.
  useEffect(() => {
    if (!ready) return;
    const hidden = [...hiddenAnswers].slice(-MAX_HIDDEN_SENT);
    const value: StagePresence = presenting
      ? { slide, build, moment, joinOpen: joinOpen || joinShown, hidden, paused: false, cue }
      : { slide, build, moment: null, joinOpen: false, hidden, paused: true, cue };
    playhtml.presence.setMyPresence(STAGE_CHANNEL, value);
  }, [ready, presenting, slide, build, moment, joinOpen, joinShown, hiddenAnswers, cue]);

  // Fetch the join card's pictures with the deck, so `j` shows it at once.
  useEffect(() => {
    for (const src of [JOIN_QR, NAME_STAMP]) new Image().src = src;
  }, []);


  const here = useMemo(() => [...audience.values()], [audience]);
  // The join slide, or the join card shown over any slide with `j` for
  // latecomers. It needs nothing from the room, so it shows while the room is
  // still connecting; only the count of people waits.
  const joining = joinOpen || joinShown;
  if (!ready) {
    return joining ? (
      <div className="talk-live" aria-hidden="true">
        {joinShown && <div className="talk-live__fade" />}
        <JoinCard here={here} />
      </div>
    ) : null;
  }

  return (
    <div className="talk-live" aria-hidden="true">
      {joinShown && <div className="talk-live__fade" />}
      {moment === "circle" && <CircleLoops loops={loops} />}
      {roomMarks && <RoomMarks loops={loops} answers={shownAnswers} hidden={hiddenAnswers} />}
      {answerKind && <AnswerCloud answers={shownAnswers} kind={answerKind} hidden={hiddenAnswers} />}
      {moment === "seat" && <SeatedCursors seats={seats} audience={audience} build={build} />}
      {fridgeDoor && (
        <div className="talk-live__fridge">
          <FridgeDoor words={fridge} />
        </div>
      )}
      {joining && (
        <>
          <Glows audience={audience} />
          <JoinCard here={here} />
        </>
      )}
    </div>
  );
}
