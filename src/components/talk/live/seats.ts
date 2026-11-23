// The seats on the benches slide ("The internet has no benches", then its
// pictures one by one). Points are fractions of the slide; `build` is the
// press that brings the seat's picture in, so a seat exists only once its
// picture is on screen.

export type Seat = { x: number; y: number; name: string; build: number };

const at = (name: string, build: number, points: [number, number][]): Seat[] =>
  points.map(([x, y]) => ({ x: x / 1920, y: y / 1080, name, build }));

export const SEATS: readonly Seat[] = [
  ...at("the bench", 0, [
    [830, 520],
    [900, 522],
    [1010, 524],
    [1080, 526],
    [1150, 524],
  ]),
  ...at("the couch", 1, [
    [560, 395],
    [650, 410],
  ]),
  ...at("the chair", 1, [[350, 420]]),
  ...at("the long table", 2, [
    [1365, 420],
    [1450, 455],
    [1530, 470],
    [1800, 470],
  ]),
  ...at("the canal", 3, [
    [1380, 940],
    [1540, 880],
    [1690, 860],
    [1800, 830],
  ]),
  ...at("the playground", 4, [
    [505, 1010],
    [250, 935],
    [380, 790],
    [285, 765],
  ]),
];

/** How close, in slide pixels, a cursor must be let go to sit on a seat. */
const REACH = 110;

/**
 * The free seat nearest to where a cursor was let go, if one is in reach.
 * `taken` holds the seats other people are on.
 */
export function seatNear(x: number, y: number, build: number, taken: ReadonlySet<number>): number | null {
  let best: number | null = null;
  let bestDistance = REACH;
  SEATS.forEach((seat, i) => {
    if (seat.build > build || taken.has(i)) return;
    const distance = Math.hypot((seat.x - x) * 1920, (seat.y - y) * 1080);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}
