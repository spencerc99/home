// The talk's fridge: one shared set of word magnets, the words taken from the
// talk itself. Everyone drags the same words; the room keeps where each one
// was left and the colour of whoever moved it last.

export const FRIDGE_WORDS: readonly string[] = [
  "the", "internet", "has", "no",
  "benches", "we", "were", "here",
  "online", "together", "play", "home",
  "live", "proof", "of", "life",
  "you", "is", "a", "soft",
  "our", "with", "s", "ing",
];

/** The fridge is a tall door, 3:4, so it fits a phone held upright. */
export const FRIDGE_ASPECT = 3 / 4;

/** Where a word starts before anyone moves it: loose rows, a little scattered. */
export function startingSpot(index: number): { x: number; y: number } {
  const perRow = 4;
  const row = Math.floor(index / perRow);
  const col = index % perRow;
  const rows = Math.ceil(FRIDGE_WORDS.length / perRow);
  const wobble = (salt: number) => ((Math.sin(index * 12.9898 + salt) * 43758.5453) % 1) * 0.03;
  return {
    x: 0.08 + (col / perRow) * 0.86 + wobble(1),
    y: 0.06 + (row / rows) * 0.9 + wobble(2),
  };
}

/** A small, steady tilt per word, like magnets put on by hand. */
export function tilt(index: number): number {
  return ((index * 37) % 7) - 3;
}
