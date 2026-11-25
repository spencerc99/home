// Everything in the room is written by browsers, so anyone can write anything
// to it. Nothing from the room is drawn until it has been checked here: bad
// entries are skipped, and the amounts are capped so one person cannot slow
// the stage down or break it for everyone.
import type { AudiencePresence, Fridge, LiveMoment, Loop, Loops, SeatPresence, StagePresence } from "./talkRoom";
import { FRIDGE_WORDS } from "./fridge";
import { SEATS } from "./seats";

const MOMENTS: readonly LiveMoment[] = ["join", "circle", "seat", "fridge", "patina", "finale"];
/** The most loops the stage will draw, newest kept. */
export const MAX_DRAWN_LOOPS = 1500;
const MAX_POINTS = 400;

/** Colours the phones produce: hsl(...) or a hex colour. Anything else is refused. */
export function safeColor(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  if (/^hsl\(\s*\d{1,3}(\.\d+)?,\s*\d{1,3}(\.\d+)?%,\s*\d{1,3}(\.\d+)?%\s*\)$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  return null;
}

const unit = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

export function parseStage(value: unknown): StagePresence | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!Number.isInteger(v.slide) || (v.slide as number) < 0 || (v.slide as number) > 200) return null;
  if (v.moment !== null && !MOMENTS.includes(v.moment as LiveMoment)) return null;
  if (!Number.isInteger(v.build) || (v.build as number) < 0 || (v.build as number) > 50) return null;
  if (typeof v.joinOpen !== "boolean") return null;
  return { slide: v.slide as number, build: v.build as number, moment: v.moment as LiveMoment | null, joinOpen: v.joinOpen };
}

export function parseAudience(value: unknown): AudiencePresence | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const color = safeColor(v.color);
  if (!color) return null;
  if (v.touch === null) return { color, touch: null };
  const t = v.touch as Record<string, unknown> | undefined;
  if (!t || !unit(t.x, 0, 1) || !unit(t.y, 0, 1)) return null;
  return { color, touch: { x: t.x as number, y: t.y as number } };
}

export function parseSeat(value: unknown): SeatPresence | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!unit(v.x, 0, 1) || !unit(v.y, 0, 1)) return null;
  if (v.seat !== null && !(Number.isInteger(v.seat) && (v.seat as number) >= 0 && (v.seat as number) < SEATS.length)) return null;
  return { x: v.x as number, y: v.y as number, seat: v.seat as number | null };
}

/** The moved fridge words that are safe to draw; unknown words are skipped. */
export function parseFridge(data: unknown): Fridge {
  if (!data || typeof data !== "object") return {};
  const out: Fridge = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= FRIDGE_WORDS.length) continue;
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const color = safeColor(v.color);
    if (!color || !unit(v.x, 0, 1) || !unit(v.y, 0, 1)) continue;
    out[key] = { x: v.x as number, y: v.y as number, color };
  }
  return out;
}

function parseLoop(value: unknown): Loop | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const color = safeColor(v.color);
  if (!color || !Array.isArray(v.points) || v.points.length < 4 || v.points.length > MAX_POINTS * 2) return null;
  if (!v.points.every((p) => unit(p, -1.5, 1.5))) return null;
  return { color, points: v.points as number[] };
}

/** The loops that are safe to draw, at most MAX_DRAWN_LOOPS of them. */
export function parseLoops(data: unknown): Loops {
  if (!data || typeof data !== "object") return {};
  const out: Loops = {};
  const entries = Object.entries(data as Record<string, unknown>);
  for (const [key, value] of entries.slice(-MAX_DRAWN_LOOPS)) {
    if (key.length > 200) continue;
    const loop = parseLoop(value);
    if (loop) out[key] = loop;
  }
  return out;
}
