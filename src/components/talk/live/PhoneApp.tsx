import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AUDIENCE_CHANNEL,
  STAGE_CHANNEL,
  joinTalkRoom,
  titleLoops,
  playhtml,
  throttle,
  type AudiencePresence,
  type Loops,
  type StagePresence,
} from "./talkRoom";
import { wakeThreshold } from "./moments";
import { readAudience, readStage } from "./roomData";
import "./phone.scss";

// What a phone shows: the door, the colour pick, then whatever the stage is
// doing. Between turns it stays quiet so people look up, not down.

const COLORS = [
  "hsl(33, 100%, 56%)",
  "hsl(200, 70%, 58%)",
  "hsl(140, 40%, 52%)",
  "hsl(340, 70%, 66%)",
  "hsl(50, 90%, 56%)",
  "hsl(265, 45%, 64%)",
];
const COLOR_KEY = "talk:color";
// Fingers reach the stage at most five times a second, so a full room does
// not swamp the venue wifi; the stage eases between updates.
const TOUCH_EVERY_MS = 200;
const MAX_LOOP_POINTS = 160;
const MAX_LOOPS_EACH = 24;

type Step = "door" | "pick" | "room";

function savedColor(): string | null {
  try {
    return localStorage.getItem(COLOR_KEY);
  } catch {
    return null;
  }
}

/** Keeps the screen awake while the talk runs; phones lock in the quiet parts. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock.request("screen").then(
        (l) => (lock = l),
        (error: unknown) => console.warn("[talk] screen wake lock refused", error),
      );
    };
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, [on]);
}

/** The stage that is presenting, if any, and how many phones are here. */
function useRoom(ready: boolean) {
  const [stage, setStage] = useState<StagePresence | null>(null);
  const [audience, setAudience] = useState<AudiencePresence[]>([]);
  useEffect(() => {
    if (!ready) return;
    const readStage = () => {
      let found: StagePresence | null = null;
      for (const view of playhtml.presence.getPresences().values()) {
        const value = readStage(view[STAGE_CHANNEL]);
        if (value) found = value;
      }
      setStage(found);
    };
    // A phone only shows counts, so a few reads a second is plenty, however
    // many fingers are moving in the room.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const countAudience = () => {
      pending = null;
      const people: AudiencePresence[] = [];
      for (const view of playhtml.presence.getPresences().values()) {
        const value = readAudience(view[AUDIENCE_CHANNEL]);
        if (value) people.push(value);
      }
      setAudience(people);
    };
    const readAudience = () => {
      pending ??= setTimeout(countAudience, 250);
    };
    readStage();
    countAudience();
    const offStage = playhtml.presence.onPresenceChange(STAGE_CHANNEL, readStage);
    const offAudience = playhtml.presence.onPresenceChange(AUDIENCE_CHANNEL, readAudience);
    return () => {
      offStage();
      offAudience();
      if (pending) clearTimeout(pending);
    };
  }, [ready]);
  return { stage, audience };
}

function Byline() {
  return (
    <div className="phone__byline">
      Spencer Chang
      <br />
      <span>spencer.place</span>
    </div>
  );
}

function Door({ here, onJoin }: { here: number; onJoin: () => void }) {
  return (
    <div className="phone__screen">
      <div className="phone__intro">
        <Byline />
        <h1>Play Together</h1>
        <p>This page is part of the talk. Keep it open the whole time.</p>
      </div>
      <div className="phone__bottom">
        <button type="button" className="phone__pill" onClick={onJoin}>
          Join the room
        </button>
        <p className="phone__meta">{here === 1 ? "1 person here" : `${here} people here`}</p>
      </div>
    </div>
  );
}

function Pick({ initial, onPick }: { initial: string; onPick: (color: string) => void }) {
  const [color, setColor] = useState(initial);
  const [hue, setHue] = useState(223);
  return (
    <div className="phone__screen">
      <div className="phone__intro">
        <h2>Pick your color</h2>
        <p>This is you on the big screen tonight.</p>
      </div>
      <div className="phone__swatches">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Choose ${c}`}
            aria-pressed={c === color}
            className="phone__swatch"
            style={{ ["--swatch" as string]: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <label className="phone__mix">
        <span>or mix your own</span>
        <input
          type="range"
          min={0}
          max={359}
          value={hue}
          style={{ ["--thumb" as string]: `hsl(${hue}, 65%, 60%)` }}
          onChange={(event) => {
            const next = Number(event.target.value);
            setHue(next);
            setColor(`hsl(${next}, 65%, 60%)`);
          }}
        />
      </label>
      <div className="phone__bottom">
        <button type="button" className="phone__pill" style={{ background: color }} onClick={() => onPick(color)}>
          That's me
        </button>
      </div>
    </div>
  );
}

/**
 * Keeps getting moves when the finger slides off the element. A pointer that
 * has already been released cannot be captured; the pad still works without.
 */
function capture(event: ReactPointerEvent<Element>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch (error) {
    console.warn("[talk] pointer capture refused", error);
  }
}

/** A pad that sends where the finger is, for the lobby and the warm-up. */
function TouchPad({
  color,
  onTouch,
  children,
}: {
  color: string;
  onTouch: (touch: { x: number; y: number } | null) => void;
  children?: React.ReactNode;
}) {
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  // When the screen changes under a finger (the lobby turning into the
  // warm-up), the old touch must not carry over and count as holding.
  const latestOnTouch = useRef(onTouch);
  latestOnTouch.current = onTouch;
  useEffect(() => () => latestOnTouch.current(null), []);
  const place = (event: ReactPointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (event.clientY - r.top) / r.height)),
    };
  };
  const lift = () => {
    setFinger(null);
    onTouch(null);
  };
  return (
    <div
      className="phone__pad"
      onPointerDown={(event) => {
        capture(event);
        const p = place(event);
        setFinger(p);
        onTouch(p);
      }}
      onPointerMove={(event) => {
        if (!finger) return;
        const p = place(event);
        // A held finger trembles; only real moves go out to the room.
        if (Math.hypot(p.x - finger.x, p.y - finger.y) < 0.02) return;
        setFinger(p);
        onTouch(p);
      }}
      onPointerUp={lift}
      onPointerCancel={lift}
    >
      {children}
      {finger && (
        <span
          className="phone__glow"
          style={{ left: `${finger.x * 100}%`, top: `${finger.y * 100}%`, ["--glow" as string]: color }}
        />
      )}
    </div>
  );
}

/** Draw loops; each one is saved to the room when the finger lifts. */
function DrawPad({ color, pid }: { color: string; pid: string }) {
  const [points, setPoints] = useState<number[]>([]);
  const [count, setCount] = useState(0);
  const drawing = useRef(false);

  useEffect(() => {
    const channel = titleLoops();
    const mine = (data: Loops) => Object.keys(data).filter((key) => key.startsWith(`${pid}:`)).length;
    setCount(mine(channel.getData()));
    return channel.onUpdate((data) => setCount(mine(data)));
  }, [pid]);

  const at = (event: ReactPointerEvent<SVGSVGElement>): [number, number] => {
    const r = event.currentTarget.getBoundingClientRect();
    // -1..1 from the pad's centre, so the stage can place it on the title.
    const x = ((event.clientX - r.left) / r.width) * 2 - 1;
    const y = ((event.clientY - r.top) / r.height) * 2 - 1;
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  };

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const channel = titleLoops();
    if (points.length >= 16 && count < MAX_LOOPS_EACH) {
      // Keep every nth point so a long loop stays small in the room's data.
      const step = Math.max(1, Math.ceil(points.length / 2 / MAX_LOOP_POINTS));
      const kept: number[] = [];
      for (let i = 0; i < points.length; i += 2 * step) kept.push(points[i], points[i + 1]);
      const key = `${pid}:${count}`;
      channel.setData((draft) => {
        draft[key] = { color, points: kept };
      });
    }
    setPoints([]);
  };

  const path = points.reduce(
    (d, v, i) => (i % 2 === 0 ? `${d}${i === 0 ? "M" : "L"}${(v + 1) * 50} ` : `${d}${(v + 1) * 50} `),
    "",
  );

  return (
    <div className="phone__screen phone__screen--turn">
      <div className="phone__intro phone__intro--center">
        <h2>Draw a circle</h2>
        <p>Keep going round. Every loop joins the title.</p>
      </div>
      <svg
        className="phone__draw"
        viewBox="0 0 100 100"
        onPointerDown={(event) => {
          capture(event);
          drawing.current = true;
          setPoints(at(event));
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const [x, y] = at(event);
          setPoints((p) => [...p, x, y]);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        <circle cx="50" cy="50" r="34" className="phone__guide" />
        <path d={path} stroke={color} />
      </svg>
      <p className="phone__meta">{count === 1 ? "your loops: 1" : `your loops: ${count}`}</p>
    </div>
  );
}

export function PhoneApp() {
  const [ready, setReady] = useState(false);
  // Someone who already picked a color (a reload, or the phone dropping the
  // tab mid-talk) goes straight back into the room.
  const [step, setStep] = useState<Step>(() => (savedColor() ? "room" : "door"));
  const [color, setColor] = useState<string>(() => savedColor() ?? COLORS[Math.floor(Math.random() * COLORS.length)]);
  const [flash, setFlash] = useState(false);
  const { stage, audience } = useRoom(ready);
  useWakeLock(step === "room");

  useEffect(() => {
    joinTalkRoom().then(
      () => setReady(true),
      (error: unknown) => console.error("[talk] could not join the room", error),
    );
  }, []);

  const sendTouch = useRef(
    throttle<AudiencePresence>(TOUCH_EVERY_MS, (value) => playhtml.presence.setMyPresence(AUDIENCE_CHANNEL, value)),
  ).current;

  // Being in the room is being counted, even with no finger down.
  useEffect(() => {
    if (!ready || step !== "room") return;
    playhtml.presence.setMyPresence(AUDIENCE_CHANNEL, { color, touch: null } satisfies AudiencePresence);
  }, [ready, step, color]);

  const touch = useCallback(
    (at: { x: number; y: number } | null) => sendTouch({ color, touch: at }),
    [color, sendTouch],
  );

  // A turn starts with the screen flashing your colour (phones cannot vibrate
  // from a web page on iPhone).
  const moment = stage?.moment ?? null;
  const lastMoment = useRef(moment);
  useEffect(() => {
    if (moment && moment !== lastMoment.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 900);
      lastMoment.current = moment;
      return () => clearTimeout(timer);
    }
    lastMoment.current = moment;
  }, [moment]);

  const here = audience.length;
  let screen: React.ReactNode;
  if (step === "door") {
    screen = <Door here={here} onJoin={() => setStep("pick")} />;
  } else if (step === "pick") {
    screen = (
      <Pick
        initial={color}
        onPick={(picked) => {
          setColor(picked);
          try {
            localStorage.setItem(COLOR_KEY, picked);
          } catch (error) {
            console.warn("[talk] could not remember your color", error);
          }
          setStep("room");
        }}
      />
    );
  } else if (!ready) {
    screen = (
      <div className="phone__screen phone__screen--quiet">
        <p>Finding the room…</p>
      </div>
    );
  } else if (moment === "warmup") {
    const holding = audience.filter((p) => p.touch).length;
    const needed = wakeThreshold(here);
    screen = (
      <div className="phone__screen phone__screen--turn">
        <div className="phone__intro phone__intro--center">
          <h2>Press and hold</h2>
          <p>The slide wakes up when enough of us hold on.</p>
        </div>
        <TouchPad color={color} onTouch={touch} />
        <div className="phone__progress">
          <span style={{ width: `${Math.min(1, holding / needed) * 100}%` }} />
        </div>
        <p className="phone__meta">
          {holding} of {needed} holding
        </p>
      </div>
    );
  } else if (moment === "title") {
    screen = <DrawPad color={color} pid={playhtml.presence.getMyIdentity().publicKey} />;
  } else if (!stage || stage.joinOpen) {
    screen = (
      <div className="phone__screen">
        <TouchPad color={color} onTouch={touch}>
          <p className="phone__hint">Touch anywhere</p>
        </TouchPad>
        <p className="phone__bottom-note">We start in a few minutes. Your touch shows up on the big screen.</p>
      </div>
    );
  } else {
    screen = (
      <div className="phone__screen phone__screen--quiet">
        <span className="phone__dot" style={{ ["--glow" as string]: color }} />
        <p>Nothing to do right now. Your screen lights up when there is.</p>
      </div>
    );
  }

  return (
    <main className="phone" style={{ ["--me" as string]: color }}>
      {step === "room" && (
        <div className="phone__top">
          <span className="phone__me" /> you
        </div>
      )}
      {screen}
      {flash && <div className="phone__flash" aria-hidden="true" />}
    </main>
  );
}
