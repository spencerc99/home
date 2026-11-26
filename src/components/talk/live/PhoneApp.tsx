import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AUDIENCE_CHANNEL,
  FRIDGE_REREAD_MS,
  SEAT_CHANNEL,
  STAGE_CHANNEL,
  fridgeWords,
  answers,
  ANSWER_MAX_CHARS,
  type AnswerKind,
  joinTalkRoom,
  circleLoops,
  playhtml,
  talkEvent,
  throttle,
  type AudiencePresence,
  type Fridge,
  type SeatPresence,
  type StagePresence,
} from "./talkRoom";
import { parseAudience, parseFridge, parseSeat, parseStage } from "./roomData";
import { SEATS, seatNear } from "./seats";
import { FridgeDoor } from "./FridgeDoor";
import { KeepsakeCard } from "./KeepsakeCard";
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
/** How long the start-of-talk flash runs: three flashes and the words. */
const HELLO_FLASH_MS = 3600;
// Loops: a point is added once the finger moves this far (pad units, -1..1),
// new points go to the room this often, and each loop is capped in size.
const POINT_STEP = 0.02;
const SEND_EVERY_MS = 100;
const MIN_LOOP_POINTS = 8;
const MAX_LOOP_POINTS = 300;
const MAX_LOOPS_EACH = 40;
/** The most points the drawing pad shows of the gesture under the finger. */
const MAX_PAD_POINTS = 600;

type Step = "door" | "pick" | "room";

function savedColor(): string | null {
  try {
    return localStorage.getItem(COLOR_KEY);
  } catch {
    return null;
  }
}

// What this tab has seen of the talk, kept for the tab's life, so a reload
// (see useFreshAfterSleep) picks up where the phone left off.
const sessionKey = (name: string) => `talk:${talkEvent()}:${name}`;

function readSession<T>(name: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(sessionKey(name));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeSession(name: string, value: unknown) {
  try {
    sessionStorage.setItem(sessionKey(name), JSON.stringify(value));
  } catch (error) {
    console.warn("[talk] could not keep this tab's progress", error);
  }
}

/**
 * How long a phone can be locked or put away before it reloads on coming
 * back. After a long sleep its connection may be dead without the browser
 * noticing (a phone that hopped from venue wifi to cellular while locked),
 * and playhtml has no heartbeat to catch that, so the phone would sit on an
 * old slide. A reload reconnects in a second or two. Quick glances at another
 * app stay under this and keep the page as it is.
 */
const WAKE_RELOAD_AFTER_MS = 30_000;

function useFreshAfterSleep(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let hiddenAt: number | null =
      document.visibilityState === "hidden" ? Date.now() : null;
    // Reloading with no network shows the browser's error page, so a phone
    // that wakes offline waits for the network first.
    const onOnline = () => location.reload();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt ??= Date.now();
        return;
      }
      const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      if (away < WAKE_RELOAD_AFTER_MS) return;
      if (navigator.onLine) location.reload();
      else window.addEventListener("online", onOnline, { once: true });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [on]);
}

/** Keeps the screen awake while the talk runs; phones lock in the quiet parts. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock.request("screen").then(
        (l) => (lock = l),
        (error: unknown) =>
          console.warn("[talk] screen wake lock refused", error),
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

/**
 * How long a phone keeps showing the slide it was on after the room goes
 * quiet. Venue wifi drops for a few seconds at a time; the phone carries on
 * as if nothing happened, and what people do meanwhile is sent once the
 * connection is back.
 */
const ROOM_HOLD_MS = 20000;

/** The stage that is presenting, if any, and how many phones are here. */
function useRoom(ready: boolean) {
  const [stage, setStage] = useState<StagePresence | null>(null);
  const [audience, setAudience] = useState<AudiencePresence[]>([]);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  useEffect(() => {
    if (!ready) return;
    let hold: ReturnType<typeof setTimeout> | null = null;
    const readStage = () => {
      // A live stage wins; a stage with live off means quiet now. Only when no
      // stage is heard at all (a dropped connection) does the phone wait.
      let found: StagePresence | null = null;
      let pausedOnly = false;
      for (const view of playhtml.presence.getPresences().values()) {
        const value = parseStage(view[STAGE_CHANNEL]);
        if (!value) continue;
        if (value.paused) pausedOnly = true;
        else found = value;
      }
      if (found || pausedOnly || !stageRef.current) {
        if (hold) clearTimeout(hold);
        hold = null;
        setStage(found);
        return;
      }
      // The stage vanished: this phone's connection may have dropped, or the
      // stage's. Keep the slide up for a while before going quiet.
      hold ??= setTimeout(() => {
        hold = null;
        setStage(null);
      }, ROOM_HOLD_MS);
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
    const offStage = playhtml.presence.onPresenceChange(
      STAGE_CHANNEL,
      readStage,
    );
    const offAudience = playhtml.presence.onPresenceChange(
      AUDIENCE_CHANNEL,
      readAudience,
    );
    return () => {
      offStage();
      offAudience();
      if (pending) clearTimeout(pending);
      if (hold) clearTimeout(hold);
    };
  }, [ready]);
  return { stage, audience };
}

function Byline() {
  return (
    <div className="phone__byline">
      Spencer Chang
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
        <p>
          Welcome to the talk! We're going to be doing some collective
          exercises..
        </p>
      </div>
      <div className="phone__bottom">
        <button type="button" className="phone__pill" onClick={onJoin}>
          Join
        </button>
        <p className="phone__meta">
          {here === 1 ? "1 person here" : `${here} people here`}
        </p>
      </div>
    </div>
  );
}

function Pick({
  initial,
  onPick,
}: {
  initial: string;
  onPick: (color: string) => void;
}) {
  const [color, setColor] = useState(initial);
  const [hue, setHue] = useState(223);
  return (
    <div className="phone__screen">
      <div className="phone__intro">
        <h2>Pick your color</h2>
        <p>Find something that represents you or how you're feeling today.</p>
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
        <button
          type="button"
          className="phone__pill"
          style={{ background: color }}
          onClick={() => onPick(color)}
        >
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

/**
 * Keeps a finger on this element from scrolling or zooming the page. iOS
 * Safari can miss `touch-action: none` on an element that appears after the
 * page has loaded, and then cancels the pointer as soon as the finger moves,
 * so the pads also refuse the touch gestures directly.
 */
function useHoldsFinger<T extends Element>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const hold = (event: Event) => event.preventDefault();
    element.addEventListener("touchstart", hold, { passive: false });
    element.addEventListener("touchmove", hold, { passive: false });
    return () => {
      element.removeEventListener("touchstart", hold);
      element.removeEventListener("touchmove", hold);
    };
  }, []);
  return ref;
}

const DEBUG_EVENTS = [
  "touchstart",
  "touchmove",
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
] as const;

/**
 * With `debug` in the address: what this phone hears from the stage, and how
 * many finger events reach the page, for finding why a pad does nothing.
 */
function DebugPanel({
  ready,
  stage,
}: {
  ready: boolean;
  stage: StagePresence | null;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [target, setTarget] = useState("");
  useEffect(() => {
    const seen = (event: Event) => {
      setCounts((c) => ({ ...c, [event.type]: (c[event.type] ?? 0) + 1 }));
      if (event.type === "pointerdown" && event.target instanceof Element)
        setTarget(
          `${event.target.tagName.toLowerCase()}.${event.target.getAttribute("class") ?? ""}`,
        );
    };
    for (const type of DEBUG_EVENTS)
      document.addEventListener(type, seen, { capture: true, passive: true });
    return () => {
      for (const type of DEBUG_EVENTS)
        document.removeEventListener(type, seen, { capture: true });
    };
  }, []);
  return (
    <pre className="phone__debug">
      {`connected ${ready}\n`}
      {stage
        ? `slide ${stage.slide + 1}.${stage.build} moment ${stage.moment ?? "-"}${stage.paused ? " paused" : ""}\n`
        : "no stage\n"}
      {DEBUG_EVENTS.map((type) => `${type} ${counts[type] ?? 0}`).join("\n")}
      {`\ndown on ${target || "-"}`}
    </pre>
  );
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
  // Where the finger last was, so the glow can fade there after it lifts.
  const [mark, setMark] = useState<{ x: number; y: number } | null>(null);
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
  const pad = useHoldsFinger<HTMLDivElement>();
  return (
    <div
      ref={pad}
      className="phone__pad"
      onPointerDown={(event) => {
        capture(event);
        const p = place(event);
        setFinger(p);
        setMark(p);
        onTouch(p);
      }}
      onPointerMove={(event) => {
        if (!finger) return;
        const p = place(event);
        // A held finger trembles; only real moves go out to the room.
        if (Math.hypot(p.x - finger.x, p.y - finger.y) < 0.02) return;
        setFinger(p);
        setMark(p);
        onTouch(p);
      }}
      onPointerUp={lift}
      onPointerCancel={lift}
    >
      {children}
      {mark && (
        <span
          className="phone__glow"
          data-lifted={finger ? undefined : true}
          style={{
            left: `${mark.x * 100}%`,
            top: `${mark.y * 100}%`,
            ["--glow" as string]: color,
          }}
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
    () =>
      Object.keys(circleLoops().getData()).filter((key) =>
        key.startsWith(`${pid}:`),
      ).length,
  );
  const countRef = useRef(count);
  // The loop being saved: its key, its points, and how many are already in the room.
  const loop = useRef<{ key: string; points: number[]; sent: number } | null>(
    null,
  );
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
    circleLoops().setData((draft) => {
      if (first) draft[current.key] = { color, points: fresh };
      else draft[current.key]?.points.push(...fresh);
    });
  };

  const begin = (x: number, y: number) => {
    loop.current =
      countRef.current < MAX_LOOPS_EACH
        ? { key: `${pid}:${Date.now().toString(36)}`, points: [x, y], sent: 0 }
        : null;
  };

  // Ends the loop being saved. Taps and tiny scribbles are taken back out.
  const end = () => {
    send();
    const current = loop.current;
    loop.current = null;
    if (!current || current.sent === 0) return;
    if (current.points.length < MIN_LOOP_POINTS * 2) {
      circleLoops().setData((draft) => {
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

  const pad = useHoldsFinger<SVGSVGElement>();
  const path = drawn.reduce(
    (d, v, i) =>
      i % 2 === 0
        ? `${d}${i === 0 ? "M" : "L"}${(v + 1) * 45} `
        : `${d}${(v + 1) * 80} `,
    "",
  );

  return (
    <div className="phone__screen phone__screen--turn">
      <div className="phone__intro phone__intro--center">
        <h2>Draw a circle</h2>
        <p>Contribute to our collective loops.</p>
      </div>
      <svg
        ref={pad}
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
          // Only the recent part of a long scribble stays on the pad.
          setDrawn((points) => [...points.slice(-MAX_PAD_POINTS * 2), x, y]);
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
      <p className="phone__meta">
        {count === 1 ? "your loops: 1" : `your loops: ${count}`}
      </p>
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
    sitting: false,
    seat: null,
  }));
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
    // Anywhere is a seat; near a free one in the pictures, it sits on that.
    move({
      ...at,
      sitting: true,
      seat: seatNear(at.x, at.y, build, takenSeats()),
    });
  };

  const pad = useHoldsFinger<HTMLDivElement>();
  const seat =
    cursor.sitting && cursor.seat !== null && SEATS[cursor.seat].build <= build
      ? SEATS[cursor.seat]
      : null;
  return (
    <div className="phone__screen phone__screen--turn">
      <div className="phone__intro phone__intro--center">
        <h2>Take a seat</h2>
        <p>Drag to move your cursor and find a seat.</p>
      </div>
      <div
        ref={pad}
        className="phone__pad phone__trackpad"
        onPointerDown={(event) => {
          capture(event);
          finger.current = { x: event.clientX, y: event.clientY };
          if (latest.current.sitting)
            move({ ...latest.current, sitting: false, seat: null });
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
            sitting: false,
            seat: null,
          });
        }}
        onPointerUp={letGo}
        onPointerCancel={letGo}
      >
        <p className="phone__hint">
          {cursor.sitting ? "Sitting" : "Drag here"}
        </p>
      </div>
      <p className="phone__meta">
        {seat
          ? `you are sitting on ${seat.name}`
          : cursor.sitting
            ? "you sat down"
            : "look up at the big screen"}
      </p>
    </div>
  );
}

const ASK: Record<
  AnswerKind,
  { title: string; prompt: string; example: string }
> = {
  wish: {
    title: "Make a wish",
    prompt: "What else could computers be?",
    example: "slow, like a garden",
  },
};
/** A short pause between sends, so one person can't flood the screen. */
const SEND_GAP_MS = 1500;

/** Type a wish; each one sent shows up on the big screen. */
function AnswerPad({
  kind,
  color,
  pid,
}: {
  kind: AnswerKind;
  color: string;
  pid: string;
}) {
  const [text, setTextNow] = useState(() =>
    readSession(`draft:${kind}`, ""),
  );
  const setText = (value: string) => {
    setTextNow(value);
    writeSession(`draft:${kind}`, value);
  };
  const [sent, setSentNow] = useState<string[]>(() =>
    readSession(`sent:${kind}`, []),
  );
  const setSent = (update: (list: string[]) => string[]) =>
    setSentNow((list) => {
      const next = update(list);
      writeSession(`sent:${kind}`, next);
      return next;
    });
  const [waiting, setWaiting] = useState(false);
  const ask = ASK[kind];
  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || waiting) return;
    const at = Date.now();
    answers().setData((draft) => {
      draft[`${pid}:${at.toString(36)}`] = {
        kind,
        text: trimmed.slice(0, ANSWER_MAX_CHARS),
        color,
        at,
      };
    });
    setSent((list) => [trimmed, ...list]);
    setText("");
    setWaiting(true);
    setTimeout(() => setWaiting(false), SEND_GAP_MS);
  };
  return (
    <div className="phone__screen phone__screen--turn">
      <div className="phone__intro phone__intro--center">
        <h2>{ask.title}</h2>
        <p>{ask.prompt}</p>
      </div>
      <form
        className="phone__answer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label htmlFor="talk-answer" className="phone__visually-hidden">
          {ask.prompt}
        </label>
        <input
          id="talk-answer"
          value={text}
          maxLength={ANSWER_MAX_CHARS}
          placeholder={ask.example}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(event) => setText(event.target.value)}
        />
        <p className="phone__meta">
          {text.length}/{ANSWER_MAX_CHARS}
        </p>
        <button
          type="submit"
          className="phone__pill"
          style={{ background: color }}
          disabled={!text.trim() || waiting}
        >
          {waiting ? "sent" : "send to the screen"}
        </button>
      </form>
      {sent.length > 0 && (
        <ul className="phone__sent" aria-label="What you sent">
          {sent.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** If the phone page ever breaks, say so plainly instead of going blank. */
class PhoneBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
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
          <button
            type="button"
            className="phone__pill"
            onClick={() => window.location.reload()}
          >
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
  const [step, setStep] = useState<Step>(() =>
    savedColor() ? "room" : "door",
  );
  const [color, setColor] = useState<string>(
    () => savedColor() ?? COLORS[Math.floor(Math.random() * COLORS.length)],
  );
  // The screen flashing this phone's colour: "hello" when the talk starts,
  // "turn" when a slide asks something of the room. `n` restarts it. A
  // finished flash stays on the page, see-through: taking its layer away
  // leaves iOS browsers ignoring drags on a pad nobody touched yet.
  const [flash, setFlash] = useState<{
    kind: "hello" | "turn";
    n: number;
    done?: true;
  } | null>(null);
  // Both are kept across a reload: the welcome flash plays once a talk, and
  // the card stays once the finale has come.
  const [started, setStarted] = useState(() => readSession("started", false));
  // Once the finale has come, the phone keeps the card, even after the talk.
  const [cardSeen, setCardSeen] = useState(() =>
    readSession("card-seen", false),
  );
  // The answers the presenter hid, as last heard from the stage.
  const [hiddenAnswers, setHiddenAnswers] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const { stage, audience } = useRoom(ready);
  const [debug] = useState(() =>
    new URLSearchParams(location.search).has("debug"),
  );
  useWakeLock(step === "room");
  useFreshAfterSleep(step === "room");

  useEffect(() => {
    joinTalkRoom().then(
      () => setReady(true),
      (error: unknown) =>
        console.error("[talk] could not join the room", error),
    );
  }, []);

  // Before the room connects, a touch only lights up this phone.
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const sendTouch = useRef(
    throttle<AudiencePresence>(TOUCH_EVERY_MS, (value) => {
      if (readyRef.current)
        playhtml.presence.setMyPresence(AUDIENCE_CHANNEL, value);
    }),
  ).current;

  // Being in the room is being counted, even with no finger down.
  useEffect(() => {
    if (!ready || step !== "room") return;
    playhtml.presence.setMyPresence(AUDIENCE_CHANNEL, {
      color,
      touch: null,
    } satisfies AudiencePresence);
  }, [ready, step, color]);

  const touch = useCallback(
    (at: { x: number; y: number } | null) => sendTouch({ color, touch: at }),
    [color, sendTouch],
  );

  // A turn starts with the screen flashing your colour (phones cannot vibrate
  // from a web page on iPhone). The first time the stage goes live, every
  // phone flashes a few times and says what the flash means, so the room
  // learns it before the first turn.
  const moment = stage?.moment ?? null;
  useEffect(() => {
    if (moment !== "card") return;
    setCardSeen(true);
    writeSession("card-seen", true);
  }, [moment]);
  // Compared as JSON, so a new list from the stage is noticed whatever the keys hold.
  const hiddenList = stage ? JSON.stringify(stage.hidden) : null;
  useEffect(() => {
    if (hiddenList !== null)
      setHiddenAnswers(new Set(JSON.parse(hiddenList) as string[]));
  }, [hiddenList]);
  const live = stage !== null;
  const lastMoment = useRef(moment);
  // A phone reloaded mid-talk has had its welcome; it gets a turn flash for
  // whatever moment is up instead.
  const startedRef = useRef(started);
  useEffect(() => {
    const before = lastMoment.current;
    lastMoment.current = moment;
    if (live && !startedRef.current) {
      startedRef.current = true;
      setStarted(true);
      writeSession("started", true);
      setFlash((f) => ({ kind: "hello", n: (f?.n ?? 0) + 1 }));
    } else if (moment && moment !== before) {
      setFlash((f) => ({ kind: "turn", n: (f?.n ?? 0) + 1 }));
    }
  }, [live, moment]);
  useEffect(() => {
    if (!flash || flash.done) return;
    const timer = setTimeout(
      () => setFlash((f) => f && { ...f, done: true }),
      flash.kind === "hello" ? HELLO_FLASH_MS : 900,
    );
    return () => clearTimeout(timer);
  }, [flash]);

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
  } else if (moment === "circle") {
    screen = (
      <DrawPad
        color={color}
        pid={playhtml.presence.getMyIdentity().publicKey}
      />
    );
  } else if (moment === "seat" && stage) {
    screen = <SeatPad build={stage.build} />;
  } else if (moment === "fridge") {
    screen = <FridgePad color={color} />;
  } else if (moment === "card" || (cardSeen && !moment)) {
    screen = (
      <div className="phone__screen phone__screen--card">
        <div className="phone__intro phone__intro--center">
          <h2>Thanks for playing</h2>
          <p>Here's what you made with everyone tonight.</p>
        </div>
        <KeepsakeCard
          color={color}
          pid={playhtml.presence.getMyIdentity().publicKey}
          hidden={hiddenAnswers}
        />
      </div>
    );
  } else if (moment === "wish") {
    screen = (
      <AnswerPad
        key={moment}
        kind={moment}
        color={color}
        pid={playhtml.presence.getMyIdentity().publicKey}
      />
    );
  } else if (!stage || stage.joinOpen) {
    screen = (
      <div className="phone__screen">
        <TouchPad color={color} onTouch={touch}>
          <p className="phone__hint">Touch anywhere</p>
        </TouchPad>
        <p className="phone__bottom-note">
          {started
            ? "When your screen flashes your color, you can participate."
            : ""}
        </p>
      </div>
    );
  } else {
    screen = (
      <div className="phone__screen phone__screen--quiet">
        <span className="phone__dot" style={{ ["--glow" as string]: color }} />
        <p>Nothing live right now.</p>
      </div>
    );
  }

  return (
    <main
      className="phone"
      data-connected={ready || undefined}
      style={{ ["--me" as string]: color }}
    >
      {step === "room" && (
        <div className="phone__top">
          <span className="phone__me" /> you
        </div>
      )}
      {screen}
      {flash?.kind === "turn" && (
        <div key={flash.n} className="phone__flash" aria-hidden="true" />
      )}
      {flash?.kind === "hello" && (
        <div
          key={flash.n}
          className="phone__flash phone__flash--hello"
          role="status"
          aria-hidden={flash.done}
        >
          <p>This is your color. When it flashes, look up.</p>
        </div>
      )}
      {debug && <DebugPanel ready={ready} stage={stage} />}
    </main>
  );
}
