// Where each wish sits on the big screen. A wish keeps the spot it was given
// when it first arrived, so later wishes never push earlier ones around. The
// wishes grow as a cloud from the middle of the slide outward: each new one
// takes the free spot nearest the middle (nudged by its own hash so the cloud
// looks scattered). When no spot is left, every wish shrinks one type size
// around its own centre, which frees room everywhere without moving anything,
// so every wish fits on the slide however many the room sends.

/** The area wishes may use, in slide pixels (the slide is 1920x1080). */
export const ANSWER_AREA = { left: 70, top: 90, right: 1850, bottom: 1010 };
/** Type sizes, largest first. All wishes share one, stepping down as the slide fills. */
export const ANSWER_SIZES = [34, 30, 26, 22, 19, 16, 14, 12];
/** Text wraps past this many ems. */
const WRAP_EMS = 15;
const LINE_HEIGHT = 1.15;
// The card's padding around the text, in ems (see .talk-live__answer).
const PAD_X = 0.53;
const PAD_Y = 0.42;
/** Room kept clear around each card, in ems, so tilted cards don't touch. */
const GAP_EMS = 0.4;
/** How finely the area is searched for a free spot, in ems (at least 10px). */
const STEP_EMS = 0.8;
/** How far a wish's hash may nudge it from the nearest spot, in ems. */
const SCATTER_EMS = 2.5;

/** Measures a line of text at a type size, in slide pixels. */
export type Measure = (text: string, size: number) => number;

/** Every wish's centre, and the type size they all share. */
export type AnswerLayout = {
  size: number;
  centers: Map<string, { cx: number; cy: number; text: string }>;
};

/** One wish's card as drawn: its box in slide pixels. */
export type AnswerBox = { x: number; y: number; w: number; h: number };

export function newAnswerLayout(): AnswerLayout {
  return { size: ANSWER_SIZES[0], centers: new Map() };
}

/** Greedy word wrap; returns the widest line and the number of lines. */
function wrap(text: string, size: number, measure: Measure) {
  const limit = WRAP_EMS * size;
  const words = text.split(/\s+/).filter(Boolean);
  let widest = 0;
  let lines = 0;
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size) > limit) {
      widest = Math.max(widest, measure(line, size));
      lines++;
      line = word;
    } else {
      line = next;
    }
  }
  if (line || lines === 0) {
    widest = Math.max(widest, measure(line, size));
    lines++;
  }
  // A single word longer than the limit wraps anywhere (overflow-wrap).
  const over = Math.ceil(widest / limit);
  if (over > 1) {
    lines += over - 1;
    widest = limit;
  }
  return { width: widest, lines };
}

/** A card's width and height at a type size, padding included. */
export function answerSize(text: string, size: number, measure: Measure) {
  const { width, lines } = wrap(text, size, measure);
  return {
    w: Math.ceil(width + 2 * PAD_X * size) + 2,
    h: Math.ceil(lines * LINE_HEIGHT * size + PAD_Y * size),
  };
}

/** The box of a placed wish at the layout's current size. */
export function answerBox(key: string, layout: AnswerLayout, measure: Measure): AnswerBox | null {
  const c = layout.centers.get(key);
  if (!c) return null;
  const { w, h } = answerSize(c.text, layout.size, measure);
  return { x: c.cx - w / 2, y: c.cy - h / 2, w, h };
}

/** A stable small number from a string, so every screen places a wish alike. */
function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The free spot nearest the middle for a card of w×h, or null if none is left. */
function findSpot(key: string, w: number, h: number, others: AnswerBox[], size: number) {
  const { left, top, right, bottom } = ANSWER_AREA;
  const gap = GAP_EMS * size;
  const step = Math.max(10, STEP_EMS * size);
  const scatter = SCATTER_EMS * size;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;
  const jitter = hashOf(key);
  let best: { cx: number; cy: number } | null = null;
  let bestScore = Infinity;
  for (let y = top; y + h <= bottom; y += step) {
    for (let x = left; x + w <= right; x += step) {
      let free = true;
      for (const o of others) {
        if (x < o.x + o.w + gap && o.x < x + w + gap && y < o.y + o.h + gap && o.y < y + h + gap) {
          free = false;
          break;
        }
      }
      if (!free) continue;
      // Nearest the middle, measured wider than tall to match the slide,
      // plus a nudge from the wish's own hash.
      const dx = x + w / 2 - midX;
      const dy = (y + h / 2 - midY) * 1.8;
      const nudge = (((jitter ^ Math.round(x * 7 + y * 13)) % 97) / 97) * scatter;
      const score = Math.hypot(dx, dy) + nudge;
      if (score < bestScore) {
        bestScore = score;
        best = { cx: x + w / 2, cy: y + h / 2 };
      }
    }
  }
  return best;
}

/** With no free spot even at the smallest size: the spot that covers the least. */
function leastCovered(w: number, h: number, others: AnswerBox[]) {
  const { left, top, right, bottom } = ANSWER_AREA;
  // Coarser than the free-spot search: past full, any spot is a compromise.
  const step = 30;
  let best = { cx: left + w / 2, cy: top + h / 2 };
  let least = Infinity;
  for (let y = top; y + h <= bottom; y += step) {
    for (let x = left; x + w <= right; x += step) {
      let covered = 0;
      for (const o of others) {
        const ox = Math.min(x + w, o.x + o.w) - Math.max(x, o.x);
        const oy = Math.min(y + h, o.y + o.h) - Math.max(y, o.y);
        if (ox > 0 && oy > 0) covered += ox * oy;
      }
      if (covered < least) {
        least = covered;
        best = { cx: x + w / 2, cy: y + h / 2 };
      }
    }
  }
  return best;
}

/**
 * Gives every wish in `list` (oldest first) that has no spot yet a spot,
 * keeping every spot already given. Wishes no longer in the list (hidden)
 * give theirs up. Shrinks the shared type size when the slide is full.
 */
export function placeAnswers(
  list: { key: string; text: string }[],
  layout: AnswerLayout,
  measure: Measure,
): AnswerLayout {
  const keep = new Set(list.map((a) => a.key));
  for (const key of layout.centers.keys()) if (!keep.has(key)) layout.centers.delete(key);
  for (const { key, text } of list) {
    if (layout.centers.has(key)) continue;
    for (;;) {
      const size = layout.size;
      const others = [...layout.centers.keys()].map((k) => answerBox(k, layout, measure)!);
      const { w, h } = answerSize(text, size, measure);
      const spot = findSpot(key, w, h, others, size);
      if (spot) {
        layout.centers.set(key, { ...spot, text });
        break;
      }
      const smaller = ANSWER_SIZES.find((s) => s < size);
      if (smaller === undefined) {
        layout.centers.set(key, { ...leastCovered(w, h, others), text });
        break;
      }
      // Every card shrinks around its own centre: nothing moves, and none
      // can come to overlap, since each only gets smaller.
      layout.size = smaller;
    }
  }
  return layout;
}
