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
let fridgeChannel: PageDataChannel<Fridge> | null = null;
let answersChannel: PageDataChannel<Answers> | null = null;

/** Connects this page to the event's room. Safe to call from several places. */
export function joinTalkRoom(): Promise<void> {
  if (!joining) {
    playhtml.init({ room: `talk-play-together-${talkEvent()}`, cursors: { enabled: false } });
    // The saved loops are opened once, as soon as the room is up, and kept for
    // the page's life, so the stage and every phone are attached to them long
    // before anyone draws.
    joining = playhtml.ready.then(() => {
      loopsChannel = playhtml.createPageData<Loops>(LOOPS_DATA, {});
      fridgeChannel = playhtml.createPageData<Fridge>(FRIDGE_DATA, {});
      answersChannel = playhtml.createPageData<Answers>(ANSWERS_DATA, {});
    });
  }
  return joining;
}

/** The circle loops, shared by the whole room. Only after joinTalkRoom() resolves. */
export function circleLoops(): PageDataChannel<Loops> {
  if (!loopsChannel) throw new Error("[talk] the circle loops are read before the room joined");
  return loopsChannel;
}

/**
 * How often a screen showing the fridge re-reads it. playhtml 2.17 does not
 * report the very first change to a page-data channel in a new room to the
 * other screens (later changes arrive); a word moved once and left would
 * otherwise never show. The fridge is small, so re-reading is cheap.
 */
export const FRIDGE_REREAD_MS = 2000;

/** The wishes and rules people have sent. Only after joinTalkRoom() resolves. */
export function answers(): PageDataChannel<Answers> {
  if (!answersChannel) throw new Error("[talk] the answers are read before the room joined");
  return answersChannel;
}

/** The fridge words that have been moved. Only after joinTalkRoom() resolves. */
export function fridgeWords(): PageDataChannel<Fridge> {
  if (!fridgeChannel) throw new Error("[talk] the fridge is read before the room joined");
  return fridgeChannel;
}

// Presence channels. Presence is live only: it vanishes when a phone leaves.
/** The presenting stage says which slide is up and what the audience can do. */
export const STAGE_CHANNEL = "talk-stage";
/** Each phone: its colour, and where a finger is down (0..1 across the pad). */
export const AUDIENCE_CHANNEL = "talk-audience";
/** Each phone's cursor on the benches slide, and the seat it sits on. */
export const SEAT_CHANNEL = "talk-seat";

export type LiveMoment = "circle" | "seat" | "fridge" | "wish" | "card";

/** What the phones do in each moment, for the presenter's labels. */
export const MOMENT_NAMES: Record<LiveMoment, string> = {
  circle: "draw loops",
  seat: "take a seat",
  fridge: "drag fridge words",
  wish: "send wishes",
  card: "keep their card",
};

export type StagePresence = {
  slide: number;
  // How many of the slide's builds are showing, so phones know which seats exist.
  build: number;
  moment: LiveMoment | null;
  // The join card is up (slide 2's build, or j), so phones offer the touch pad.
  joinOpen: boolean;
  // Answers the presenter hid (h), newest last, so no phone's card shows them.
  hidden: string[];
  // A stage with live switched off (l). Phones go quiet at once, rather than
  // waiting out a dropped connection.
  paused: boolean;
};

/**
 * The most hidden answers the stage tells phones about, newest kept. Presence
 * values are capped at 4KB and a key is up to ~60 characters, so 60 fits; a
 * talk hides a handful at most.
 */
export const MAX_HIDDEN_SENT = 60;

export type AudiencePresence = {
  color: string;
  // Where the finger is, or null when it is lifted.
  touch: { x: number; y: number } | null;
};

/**
 * Where a phone's cursor is on the slide (0..1 each way), and whether it has
 * sat down. A cursor sits wherever it is let go; let go near a free seat in
 * the pictures, it sits on that seat (`seat`).
 */
export type SeatPresence = { x: number; y: number; sitting: boolean; seat: number | null };

// Saved data, kept with the event for the replay and keepsake cards.
/** Loops drawn on the circle-drawing slide, one entry per loop, keyed `<person>:<n>`. */
export const LOOPS_DATA = "talk-title-loops";
export type Loop = { color: string; points: number[] };
export type Loops = Record<string, Loop>;

/**
 * Fridge words people have moved, by word index: where it sits (0..1 of the
 * fridge) and who moved it last. Keyed by index into FRIDGE_WORDS, so a new
 * word list needs a new name here.
 */
export const FRIDGE_DATA = "talk-fridge-words";
export type FridgeWord = { x: number; y: number; color: string };
export type Fridge = Record<string, FridgeWord>;

/**
 * Wishes for what computing could be (slide 8) and rules for getting there
 * (rules of play), typed on phones. Keyed `<person>:<time>`, so every answer
 * is its own entry and sending never overwrites anyone else's. Hiding one
 * (the presenter's `h`) is kept on the presenting laptop, not in the room,
 * so no phone can bring a hidden answer back.
 */
export const ANSWERS_DATA = "talk-answers";
export type AnswerKind = "wish";
export type Answer = { kind: AnswerKind; text: string; color: string; at: number };
export type Answers = Record<string, Answer>;
/** The longest answer a phone can send. */
export const ANSWER_MAX_CHARS = 60;

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
