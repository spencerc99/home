import { Component, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AUDIENCE_CHANNEL,
  FRIDGE_REREAD_MS,
  SEAT_CHANNEL,
  STAGE_CHANNEL,
  fridgeWords,
  joinTalkRoom,
  titleLoops,
  playhtml,
  throttle,
  type AudiencePresence,
  type Fridge,
  type SeatPresence,
  type StagePresence,
} from "./talkRoom";
import { parseAudience, parseFridge, parseSeat, parseStage } from "./roomData";
import { SEATS, seatNear } from "./seats";
import { FridgeDoor } from "./FridgeDoor";
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
// Loops: a point is added once the finger moves this far (pad units, -1..1),
// new points go to the room this often, and each loop is capped in size.
const POINT_STEP = 0.02;
const SEND_EVERY_MS = 100;
const MIN_LOOP_POINTS = 8;
const MAX_LOOP_POINTS = 300;
const MAX_LOOPS_EACH = 40;

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
        const value = parseStage(view[STAGE_CHANNEL]);
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
        const value = parseAudience(view[AUDIENCE_CHANNEL]);
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
  // When the pad goes away under a finger (the join slide giving way to the
  // next), the touch is lifted so its glow does not stay on the big screen.
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
  // The whole gesture as drawn here, in pad units (-1..1).
  const [drawn, setDrawn] = useState<number[]>([]);
  const [count, setCount] = useState(
    () => Object.keys(titleLoops().getData()).filter((key) => key.startsWith(`${pid}:`)).length,
  );
  const countRef = useRef(count);
  // The loop being saved: its key, its points, and how many are already in the room.
  const loop = useRef<{ key: string; points: number[]; sent: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The room gets each loop while it is drawn: only the new points go out,
  // a few times a second, so the stage draws along and the loop is kept.
  const send = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = loop.current;
    if (!current || current.sent === current.points.length) return;
    const fresh = current.points.slice(current.sent);
    const first = current.sent === 0;
    current.sent = current.points.length;
    titleLoops().setData((draft) => {
      if (first) draft[current.key] = { color, points: fresh };
      else draft[current.key]?.points.push(...fresh);
    });
  };

  const begin = (x: number, y: number) => {
    loop.current =
      countRef.current < MAX_LOOPS_EACH ? { key: `${pid}:${Date.now().toString(36)}`, points: [x, y], sent: 0 } : null;
  };

  // Ends the loop being saved. Taps and tiny scribbles are taken back out.
  const end = () => {
    send();
    const current = loop.current;
    loop.current = null;
    if (!current || current.sent === 0) return;
    if (current.points.length < MIN_LOOP_POINTS * 2) {
      titleLoops().setData((draft) => {
        delete draft[current.key];
      });
      return;
    }
    countRef.current += 1;
    setCount(countRef.current);
  };

  useEffect(
    () => () => {
      end();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const at = (event: ReactPointerEvent<SVGSVGElement>): [number, number] => {
    const r = event.currentTarget.getBoundingClientRect();
    // -1..1 from the pad's centre. The pad is the slide turned on its side,
    // and the stage turns it back, so a loop lands where it was drawn.
    const x = ((event.clientX - r.left) / r.width) * 2 - 1;
    const y = ((event.clientY - r.top) / r.height) * 2 - 1;
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  };

  const drawing = useRef(false);
  const last = useRef<[number, number]>([0, 0]);

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    end();
    setDrawn([]);
  };

  const path = drawn.reduce(
    (d, v, i) => (i % 2 === 0 ? `${d}${i === 0 ? "M" : "L"}${(v + 1) * 45} ` : `${d}${(v + 1) * 80} `),
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
        viewBox="0 0 90 160"
        onPointerDown={(event) => {
          capture(event);
          drawing.current = true;
          const [x, y] = at(event);
          last.current = [x, y];
          begin(x, y);
          setDrawn([x, y]);
          send();
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const [x, y] = at(event);
          const [lx, ly] = last.current;
          if (Math.hypot(x - lx, y - ly) < POINT_STEP) return;
          last.current = [x, y];
          setDrawn((points) => [...points, x, y]);
          const current = loop.current;
          if (!current) return;
          current.points.push(x, y);
          // A long gesture becomes several loops, each small enough to keep.
          if (current.points.length >= MAX_LOOP_POINTS * 2) {
            end();
            begin(x, y);
          }
          timer.current ??= setTimeout(send, SEND_EVERY_MS);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        <circle cx="45" cy="80" r="30" className="phone__guide" />
        <path d={path} stroke={color} />
      </svg>
      <p className="phone__meta">{count === 1 ? "your loops: 1" : `your loops: ${count}`}</p>
    </div>
  );
}

// How far the cursor goes for a finger's move: a swipe across the pad
// carries it a bit more than across the whole slide, like a trackpad.
const TRACKPAD_SPEED = 1.3;

/**
 * Take a seat: the phone is a trackpad for your cursor on the big screen.
 * Let go near a seat that is showing and free, and you sit on it.
 */
function SeatPad({ build }: { build: number }) {
  const [cursor, setCursor] = useState<SeatPresence>(() => ({
    x: 0.35 + Math.random() * 0.3,
    y: 0.62 + Math.random() * 0.1,
    seat: null,
  }));
  const [missed, setMissed] = useState(false);
  const finger = useRef<{ x: number; y: number } | null>(null);
  // Throttled sends can land after this screen has gone; they must not bring
  // the cursor back.
  const gone = useRef(false);
  const send = useRef(
    throttle<SeatPresence>(TOUCH_EVERY_MS, (value) => {
      if (!gone.current) playhtml.presence.setMyPresence(SEAT_CHANNEL, value);
    }),
  ).current;
  const first = useRef(cursor);
  useEffect(() => {
    gone.current = false;
    playhtml.presence.setMyPresence(SEAT_CHANNEL, first.current);
    return () => {
      gone.current = true;
      playhtml.presence.setMyPresence(SEAT_CHANNEL, null);
    };
  }, []);

  // Moves can arrive faster than renders, so each one builds on the latest.
  const latest = useRef(cursor);
  const move = (next: SeatPresence) => {
    latest.current = next;
    setCursor(next);
    send(next);
  };

  const takenSeats = () => {
    const me = playhtml.presence.getMyIdentity().publicKey;
    const taken = new Set<number>();
    for (const [id, view] of playhtml.presence.getPresences()) {
      if (id === me) continue;
      const other = parseSeat(view[SEAT_CHANNEL]);
      if (other?.seat != null) taken.add(other.seat);
    }
    return taken;
  };

  const letGo = () => {
    if (!finger.current) return;
    finger.current = null;
    const at = latest.current;
    const seat = seatNear(at.x, at.y, build, takenSeats());
    setMissed(seat === null);
    move({ ...at, seat });
  };

  const seated = cursor.seat !== null && SEATS[cursor.seat].build <= build ? SEATS[cursor.seat] : null;
  return (
    <div className="phone__screen phone__screen--turn">
      <div className="phone__intro phone__intro--center">
        <h2>Take a seat</h2>
        <p>Drag to move your cursor on the big screen. Let go on a bench, a chair, the canal.</p>
      </div>
      <div
        className="phone__pad phone__trackpad"
        onPointerDown={(event) => {
          capture(event);
          finger.current = { x: event.clientX, y: event.clientY };
          setMissed(false);
          if (latest.current.seat !== null) move({ ...latest.current, seat: null });
        }}
        onPointerMove={(event) => {
          const from = finger.current;
          if (!from) return;
          const width = event.currentTarget.getBoundingClientRect().width;
          const scale = TRACKPAD_SPEED / width;
          const dx = (event.clientX - from.x) * scale;
          const dy = ((event.clientY - from.y) * scale * 1920) / 1080;
          finger.current = { x: event.clientX, y: event.clientY };
          const at = latest.current;
          move({
            x: Math.min(1, Math.max(0, at.x + dx)),
            y: Math.min(1, Math.max(0, at.y + dy)),
            seat: null,
          });
        }}
        onPointerUp={letGo}
        onPointerCancel={letGo}
      >
        <p className="phone__hint">{seated ? "Sitting" : "Drag here"}</p>
      </div>
      <p className="phone__meta">
        {seated ? `you are sitting on ${seated.name}` : missed ? "no free seat there, try nearer one" : "look up at the big screen"}
      </p>
    </div>
  );
}

/** The shared fridge, shrunk to the phone. Drag any word. */
function FridgePad({ color }: { color: string }) {
  const [words, setWords] = useState<Fridge>(() => parseFridge(fridgeWords().getData()));
  useEffect(() => {
    const channel = fridgeWords();
    const read = () => setWords(parseFridge(channel.getData()));
    let pending: ReturnType<typeof setTimeout> | null = null;
    const off = channel.onUpdate(() => {
      pending ??= setTimeout(() => {
        pending = null;
        read();
      }, 100);
    });
    const reread = setInterval(read, FRIDGE_REREAD_MS);
    return () => {
      off();
      clearInterval(reread);
      if (pending) clearTimeout(pending);
    };
  }, []);
  const colorRef = useRef(color);
  colorRef.current = color;
  const write = useRef(
    throttle<{ index: number; x: number; y: number }>(120, ({ index, x, y }) => {
      fridgeWords().setData((draft) => {
        draft[String(index)] = { x, y, color: colorRef.current };
      });
    }),
  ).current;
  return (
    <div className="phone__screen phone__screen--turn">
      <div className="phone__intro phone__intro--center">
        <h2>Make a line</h2>
        <p>Drag words. Everyone shares one fridge.</p>
      </div>
      <div className="phone__fridge">
        <FridgeDoor
          words={words}
          myColor={color}
          onMove={(index, spot) => write({ index, x: spot.x, y: spot.y })}
        />
      </div>
    </div>
  );
}

/** If the phone page ever breaks, say so plainly instead of going blank. */
class PhoneBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[talk] the phone page failed", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="phone">
        <div className="phone__screen phone__screen--quiet">
          <p>Something went wrong on this page.</p>
          <button type="button" className="phone__pill" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </main>
    );
  }
}

export function PhoneApp() {
  return (
    <PhoneBoundary>
      <Phone />
    </PhoneBoundary>
  );
}

function Phone() {
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
  } else if (moment === "title") {
    screen = <DrawPad color={color} pid={playhtml.presence.getMyIdentity().publicKey} />;
  } else if (moment === "seat" && stage) {
    screen = <SeatPad build={stage.build} />;
  } else if (moment === "fridge") {
    screen = <FridgePad color={color} />;
  } else if (!stage || stage.joinOpen || moment === "join") {
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
