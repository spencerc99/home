import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveMoment } from "./talkRoom";
import {
  AUDIENCE_CHANNEL,
  FRIDGE_REREAD_MS,
  SEAT_CHANNEL,
  STAGE_CHANNEL,
  fridgeWords,
  answers as answersChannel,
  hideNewestAnswer,
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

/** The most answers on screen at once; older ones make room for new ones. */
const ANSWER_SLOTS = 40;
const SLOT_COLUMNS = 5;

/** A stable small number from a string, to scatter answers the same way on every screen. */
function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Wishes or rules from the room, over a veil on the slide. Each lands in one
 * of 40 places (5 across, 8 down), nudged a little so it reads as handwritten;
 * once all 40 are taken the newest take the oldest places.
 */
function AnswerCloud({ answers, kind }: { answers: Answers; kind: "wish" | "rule" }) {
  const list = Object.entries(answers)
    .filter(([, a]) => a.kind === kind && !a.hidden)
    .sort(([, a], [, b]) => a.at - b.at);
  if (list.length === 0) return null;
  const rows = ANSWER_SLOTS / SLOT_COLUMNS;
  const cellW = (W - 160) / SLOT_COLUMNS;
  const cellH = (H - 200) / rows;
  return (
    <>
      <div className="talk-live__veil" />
      {list.slice(-ANSWER_SLOTS).map(([key, answer], i) => {
        const at = (list.length - Math.min(list.length, ANSWER_SLOTS) + i) % ANSWER_SLOTS;
        // Fill the places in a scattered order rather than row by row.
        const slot = (at * 17) % ANSWER_SLOTS;
        const h = hashOf(key);
        const x = 80 + (slot % SLOT_COLUMNS) * cellW + (h % 40);
        const y = 120 + Math.floor(slot / SLOT_COLUMNS) * cellH + ((h >> 6) % 24);
        return (
          <span
            key={key}
            className="talk-live__answer"
            style={{
              left: x,
              top: y,
              maxWidth: cellW * 1.6,
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
    // Loops grow while people draw, so updates come often; redraw once a frame.
    let frame: number | null = null;
    const read = () => {
      frame = null;
      setLoops(parseLoops(channel.getData()));
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

function Glows({ audience }: { audience: Map<string, AudiencePresence> }) {
  return (
    <>
      {[...audience].map(([id, person]) =>
        person.touch ? (
          <span
            key={id}
            className="talk-live__glow"
            style={{ left: person.touch.x * W, top: person.touch.y * H, ["--glow" as string]: person.color }}
          />
        ) : null,
      )}
    </>
  );
}

const JOIN_QR = "/talk/perpetual-play/join-qr.svg";
const NAME_STAMP = "/assets/name-stamp.png";

function JoinCard({ here }: { here: AudiencePresence[] }) {
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
      <div className="talk-live__here">
        <span className="talk-live__dots">
          {here.slice(0, 40).map((person, i) => (
            <span key={i} style={{ ["--glow" as string]: person.color }} />
          ))}
        </span>
        {here.length} here
      </div>
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
      {Object.entries(loops).map(([key, loop]) => {
        let d = "";
        for (let i = 0; i + 1 < loop.points.length; i += 2) {
          const x = ((1 - loop.points[i + 1]) / 2) * W;
          const y = ((1 + loop.points[i]) / 2) * H;
          d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
        }
        return <path key={key} d={d} stroke={loop.color} />;
      })}
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
      {[...seats].map(([id, cursor]) => {
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
  hideRequests,
  presenting,
  joinOpen,
}: {
  ready: boolean;
  slide: number;
  build: number;
  moment: LiveMoment | null;
  fridgeDoor: boolean;
  // The join slide's build that brings up the join card and fades the slide.
  joinShown: boolean;
  // Goes up by one each time the presenter presses h.
  hideRequests: number;
  presenting: boolean;
  joinOpen: boolean;
}) {
  const audience = useAudience(ready);
  const loops = useLoops(ready, moment === "circle");
  const seats = useSeats(ready, moment === "seat");
  const fridge = useFridge(ready, fridgeDoor);
  const answerKind = moment === "wish" || moment === "rule" ? moment : null;
  const shownAnswers = useAnswers(ready, answerKind !== null);

  // h hides the newest answer of the moment on screen.
  const handledHides = useRef(hideRequests);
  useEffect(() => {
    if (hideRequests === handledHides.current) return;
    handledHides.current = hideRequests;
    if (ready && answerKind) hideNewestAnswer(answerKind, shownAnswers);
  }, [hideRequests, ready, answerKind, shownAnswers]);

  // Fetch the join card's pictures with the deck, so `j` shows it at once.
  useEffect(() => {
    for (const src of [JOIN_QR, NAME_STAMP]) new Image().src = src;
  }, []);

  // Phones follow only a stage that has been switched to presenting, so
  // someone else opening /talk/stage cannot drive the room.
  useEffect(() => {
    if (!ready) return;
    const value: StagePresence | null = presenting ? { slide, build, moment, joinOpen } : null;
    playhtml.presence.setMyPresence(STAGE_CHANNEL, value);
  }, [ready, presenting, slide, build, moment, joinOpen]);

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
      {answerKind && <AnswerCloud answers={shownAnswers} kind={answerKind} />}
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
