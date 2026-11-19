import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveMoment } from "./talkRoom";
import {
  AUDIENCE_CHANNEL,
  STAGE_CHANNEL,
  titleLoops,
  playhtml,
  type AudiencePresence,
  type Loops,
  type StagePresence,
} from "./talkRoom";
import { wakeThreshold } from "./moments";

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
        const value = view[AUDIENCE_CHANNEL] as AudiencePresence | undefined;
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

function useLoops(ready: boolean, on: boolean) {
  const [loops, setLoops] = useState<Loops>({});
  useEffect(() => {
    if (!ready || !on) return;
    const channel = titleLoops();
    setLoops(channel.getData());
    return channel.onUpdate(setLoops);
  }, [ready, on]);
  return loops;
}

/** A steady number in 0..1 from a string, so a person's loops always sit in the same place. */
function hash01(text: string, salt: number): number {
  let h = salt * 2654435761;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 2654435761);
  return ((h >>> 0) % 10000) / 10000;
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

function JoinCard({ here }: { here: AudiencePresence[] }) {
  return (
    <>
      <div className="talk-live__qr">
        <img src="/talk/perpetual-play/join-qr.svg" alt="QR code for spencer.place/talk" />
        <img className="talk-live__stamp" src="/assets/name-stamp.png" alt="" />
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

/** Everyone's loops on the title, each person a little off, so they spiral. */
function TitleLoops({ loops }: { loops: Loops }) {
  return (
    <svg className="talk-live__loops" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {Object.entries(loops).map(([key, loop]) => {
        const person = key.split(":")[0];
        const radius = 300 + hash01(person, 1) * 160;
        const cx = W / 2 + (hash01(person, 2) - 0.5) * 140;
        const cy = H / 2 + (hash01(person, 3) - 0.5) * 100;
        let d = "";
        for (let i = 0; i + 1 < loop.points.length; i += 2) {
          d += `${i === 0 ? "M" : "L"}${(cx + loop.points[i] * radius).toFixed(1)} ${(cy + loop.points[i + 1] * radius).toFixed(1)} `;
        }
        return <path key={key} d={d} stroke={loop.color} />;
      })}
    </svg>
  );
}

export function LiveLayer({
  ready,
  slide,
  moment,
  presenting,
  joinOpen,
  wakeForced,
}: {
  ready: boolean;
  slide: number;
  moment: LiveMoment | null;
  presenting: boolean;
  joinOpen: boolean;
  wakeForced: boolean;
}) {
  const audience = useAudience(ready);
  const [awake, setAwake] = useState(false);
  const wake = useCallback(() => setAwake(true), []);
  const loops = useLoops(ready, moment === "title");

  // Phones follow only a stage that has been switched to presenting, so
  // someone else opening /talk/stage cannot drive the room.
  useEffect(() => {
    if (!ready) return;
    const value: StagePresence | null = presenting ? { slide, moment, joinOpen } : null;
    playhtml.presence.setMyPresence(STAGE_CHANNEL, value);
  }, [ready, presenting, slide, moment, joinOpen]);

  const here = useMemo(() => [...audience.values()], [audience]);
  if (!ready) return null;

  return (
    <div className="talk-live" aria-hidden="true">
      {moment === "warmup" && <Warmup audience={audience} forced={wakeForced} awake={awake} onWake={wake} />}
      {moment === "title" && <TitleLoops loops={loops} />}
      {joinOpen && (
        <>
          {moment !== "warmup" && <Glows audience={audience} />}
          <JoinCard here={here} />
        </>
      )}
    </div>
  );
}
