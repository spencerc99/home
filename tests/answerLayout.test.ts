import { describe, expect, test } from "bun:test";
import {
  ANSWER_AREA,
  ANSWER_SIZES,
  answerBox,
  newAnswerLayout,
  placeAnswers,
  type AnswerBox,
  type AnswerLayout,
  type AnswerSpace,
  type Measure,
} from "../src/components/talk/live/answerLayout";

// About what Vulf Sans measures: half an em per character.
const measure: Measure = (text, size) => text.length * size * 0.5;

const WISHES = [
  "slow, like a garden",
  "kind",
  "a place to be bored together",
  "weird",
  "something you can hold in your hands and pass to a friend",
  "less lonely",
  "playful",
  "like a campfire",
  "quiet",
  "made by everyone",
  "supercalifragilisticexpialidociousandthensome",
];

function wishes(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    key: `person${i % 37}:${i.toString(36)}`,
    text: WISHES[i % WISHES.length],
  }));
}

const boxes = (layout: AnswerLayout) =>
  [...layout.centers.keys()].map((k) => answerBox(k, layout, measure)!);

const inside = (b: AnswerBox) =>
  b.x >= ANSWER_AREA.left - 0.5 &&
  b.y >= ANSWER_AREA.top - 0.5 &&
  b.x + b.w <= ANSWER_AREA.right + 0.5 &&
  b.y + b.h <= ANSWER_AREA.bottom + 0.5;

const overlap = (a: AnswerBox, b: AnswerBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const centersOf = (layout: AnswerLayout) =>
  new Map([...layout.centers].map(([k, c]) => [k, { cx: c.cx, cy: c.cy }]));

describe("wish layout on the big screen", () => {
  test("an earlier wish keeps its spot when later wishes arrive, even as all shrink", () => {
    const layout = newAnswerLayout();
    const list = wishes(150);
    placeAnswers(list.slice(0, 10), layout, measure);
    const before = centersOf(layout);
    placeAnswers(list, layout, measure);
    expect(layout.size).toBeLessThan(ANSWER_SIZES[0]);
    const after = centersOf(layout);
    for (const [key, c] of before) expect(after.get(key)).toEqual(c);
  });

  test("hiding a wish leaves the others where they are", () => {
    const layout = newAnswerLayout();
    const list = wishes(20);
    placeAnswers(list, layout, measure);
    const before = centersOf(layout);
    placeAnswers(list.filter((_, i) => i !== 3), layout, measure);
    expect(layout.centers.has(list[3].key)).toBe(false);
    for (const [key, c] of centersOf(layout)) expect(c).toEqual(before.get(key)!);
  });

  test("a full room's wishes all show, on the slide, without overlapping", () => {
    const layout = placeAnswers(wishes(200), newAnswerLayout(), measure);
    expect(layout.centers.size).toBe(200);
    const all = boxes(layout);
    for (const b of all) expect(inside(b)).toBe(true);
    let overlaps = 0;
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) if (overlap(all[i], all[j])) overlaps++;
    expect(overlaps).toBe(0);
  });

  test("a few wishes stay at full size", () => {
    const layout = placeAnswers(wishes(12), newAnswerLayout(), measure);
    expect(layout.size).toBe(ANSWER_SIZES[0]);
  });

  test("the same wishes land in the same spots on every screen", () => {
    const a = placeAnswers(wishes(40), newAnswerLayout(), measure);
    const b = placeAnswers(wishes(40), newAnswerLayout(), measure);
    expect([...a.centers]).toEqual([...b.centers]);
    expect(a.size).toBe(b.size);
  });

  test("even past what fits, every wish still stays on the slide", () => {
    const layout = placeAnswers(wishes(320), newAnswerLayout(), measure);
    expect(layout.centers.size).toBe(320);
    for (const b of boxes(layout)) expect(inside(b)).toBe(true);
  }, 20000);

  test("wishes flow around what is kept clear (the finale's title and contact card)", () => {
    const space: AnswerSpace = {
      area: ANSWER_AREA,
      keepClear: [
        { x: 700, y: 465, w: 520, h: 110 },
        { x: 1330, y: 840, w: 550, h: 200 },
      ],
    };
    const layout = placeAnswers(wishes(150), newAnswerLayout(), measure, space);
    expect(layout.centers.size).toBe(150);
    for (const b of boxes(layout)) for (const clear of space.keepClear) expect(overlap(b, clear)).toBe(false);
  });
});
