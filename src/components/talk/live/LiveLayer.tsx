import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveMoment } from "./talkRoom";
import {
  AUDIENCE_CHANNEL,
  FRIDGE_REREAD_MS,
  SEAT_CHANNEL,
  STAGE_CHANNEL,
  fridgeWords,
  titleLoops,
  playhtml,
  type AudiencePresence,
  type Fridge,
  type Loops,
  type SeatPresence,
  type StagePresence,
} from "./talkRoom";
import { wakeThreshold } from "./moments";
import { parseAudience, parseFridge, parseLoops, parseSeat } from "./roomData";
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
    const channel = titleLoops();
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

/** Slide 2 starts asleep; enough fingers held at once wake it. */
function Warmup({
  audience,
  forced,
  awake,
  onWake,
}: {
  audience: Map<string, AudiencePresence>;
  forced: boolean;
  // Once woken, slide 2 stays awake, even after stepping back to it.
  awake: boolean;
  onWake: () => void;
}) {
  // Fingers already down when the slide comes up are left over from the
  // lobby (phones hear about the new slide a moment after the stage). They
  // count only after lifting once.
  const carriedRef = useRef<Set<string> | null>(null);
  carriedRef.current ??= new Set([...audience].filter(([, p]) => p.touch).map(([id]) => id));
  const carried = carriedRef.current;
  for (const [id, person] of audience) if (!person.touch) carried.delete(id);
  const people = [...audience.values()];
  const holding = [...audience].filter(([id, p]) => p.touch && !carried.has(id)).length;
  const needed = wakeThreshold(people.length);
  useEffect(() => {
    if (!awake && (forced || holding >= needed)) onWake();
  }, [awake, forced, holding, needed, onWake]);
  const sleep = awake ? 0 : 1 - Math.min(1, holding / needed);
  return (
    <>
      <div className="talk-live__sleep" style={{ opacity: sleep }} />
      <Glows audience={audience} />
      {!awake && (
        <div className="talk-live__count">
          {holding} of {needed} holding
        </div>
      )}
    </>
  );
}

/**
 * Everyone's loops over the title. A phone's pad is the slide turned on its
 * side, so each point is turned back: the pad's top is the slide's right.
 */
function TitleLoops({ loops }: { loops: Loops }) {
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
        const seat = cursor.seat !== null && SEATS[cursor.seat].build <= build ? SEATS[cursor.seat] : null;
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
            data-seated={seat ? true : undefined}
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
  presenting,
  joinOpen,
  wakeForced,
}: {
  ready: boolean;
  slide: number;
  build: number;
  moment: LiveMoment | null;
  fridgeDoor: boolean;
  presenting: boolean;
  joinOpen: boolean;
  wakeForced: boolean;
}) {
  const audience = useAudience(ready);
  const [awake, setAwake] = useState(false);
  const wake = useCallback(() => setAwake(true), []);
  const loops = useLoops(ready, moment === "title");
  const seats = useSeats(ready, moment === "seat");
  const fridge = useFridge(ready, fridgeDoor);

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
  // The join card needs nothing from the room, so it shows while the room is
  // still connecting; only the count of people waits.
  if (!ready) {
    return joinOpen ? (
      <div className="talk-live" aria-hidden="true">
        <JoinCard here={here} />
      </div>
    ) : null;
  }

  return (
    <div className="talk-live" aria-hidden="true">
      {moment === "warmup" && <Warmup audience={audience} forced={wakeForced} awake={awake} onWake={wake} />}
      {moment === "title" && <TitleLoops loops={loops} />}
      {moment === "seat" && <SeatedCursors seats={seats} audience={audience} build={build} />}
      {fridgeDoor && (
        <div className="talk-live__fridge">
          <FridgeDoor words={fridge} />
        </div>
      )}
      {joinOpen && (
        <>
          {moment !== "warmup" && <Glows audience={audience} />}
          <JoinCard here={here} />
        </>
      )}
    </div>
  );
}
