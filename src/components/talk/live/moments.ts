// Rules the stage and the phones both follow, so they agree on what they show.

/**
 * How many fingers wake slide 2: a share of the people in the room, so a small
 * room can still do it. The presenter can always force it awake with `w`.
 */
export function wakeThreshold(people: number): number {
  return Math.max(1, Math.min(people, Math.max(2, Math.ceil(people * 0.4))));
}
