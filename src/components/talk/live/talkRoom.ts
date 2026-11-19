// The live room a talk's stage and every audience phone share. One playhtml
// room per event, so loops drawn at one talk never mix into another. Rehearse
// with ?event=rehearsal on both /talk and /talk/stage.
import { playhtml, type PageDataChannel } from "playhtml";

/** The event a plain spencer.place/talk link joins. */
const CURRENT_EVENT = "ncm-2026";

export function talkEvent(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("event");
  return fromUrl && /^[a-z0-9-]{1,40}$/.test(fromUrl) ? fromUrl : CURRENT_EVENT;
}

let joining: Promise<void> | null = null;
let loopsChannel: PageDataChannel<Loops> | null = null;

/** Connects this page to the event's room. Safe to call from several places. */
export function joinTalkRoom(): Promise<void> {
  if (!joining) {
    playhtml.init({ room: `talk-play-together-${talkEvent()}`, cursors: { enabled: false } });
    // The saved loops are opened once, as soon as the room is up, and kept for
    // the page's life, so the stage and every phone are attached to them long
    // before anyone draws.
    joining = playhtml.ready.then(() => {
      loopsChannel = playhtml.createPageData<Loops>(LOOPS_DATA, {});
    });
  }
  return joining;
}

/** The title loops, shared by the whole room. Only after joinTalkRoom() resolves. */
export function titleLoops(): PageDataChannel<Loops> {
  if (!loopsChannel) throw new Error("[talk] the title loops are read before the room joined");
  return loopsChannel;
}

// Presence channels. Presence is live only: it vanishes when a phone leaves.
/** The presenting stage says which slide is up and what the audience can do. */
export const STAGE_CHANNEL = "talk-stage";
/** Each phone: its colour, and where a finger is down (0..1 across the pad). */
export const AUDIENCE_CHANNEL = "talk-audience";

export type LiveMoment = "warmup" | "title" | "fridge" | "patina" | "finale";

export type StagePresence = { slide: number; moment: LiveMoment | null; joinOpen: boolean };

export type AudiencePresence = {
  color: string;
  // Where the finger is, or null when it is lifted.
  touch: { x: number; y: number } | null;
};

// Saved data, kept with the event for the replay and keepsake cards.
/** Loops drawn on the title slide, one entry per loop, keyed `<person>:<n>`. */
export const LOOPS_DATA = "talk-title-loops";
export type Loop = { color: string; points: number[] };
export type Loops = Record<string, Loop>;

/** Calls `fn` at most every `ms`, always ending on the latest value. */
export function throttle<T>(ms: number, fn: (value: T) => void): (value: T) => void {
  let last = 0;
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (value: T) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(value);
      return;
    }
    pending = { value };
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      last = Date.now();
      if (pending) fn(pending.value);
      pending = null;
    }, ms - (now - last));
  };
}

export { playhtml };
