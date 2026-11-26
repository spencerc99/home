// Keeps the stage window and the speaker notes window on the same slide.
// Both run in the same browser, so a BroadcastChannel carries every change;
// the stage owns the truth and the notes window asks it for the current state.

import { useEffect, useRef } from "react";

// `phones`: the slide's phone moment is on (the presenter pressed m).
export type DeckState = { index: number; playing: boolean; phones: boolean };

export type DeckMessage =
  | { type: "state"; state: DeckState }
  | { type: "goto"; index: number }
  | { type: "step"; by: 1 | -1 }
  | { type: "set-playing"; playing: boolean }
  | { type: "toggle-phones" }
  | { type: "hello" };

const CHANNEL = "talk:perpetual-play";
const LAST_SLIDE_KEY = "talk:perpetual-play:slide";

export function useDeckChannel(onMessage: (message: DeckMessage) => void) {
  const handler = useRef(onMessage);
  handler.current = onMessage;
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (event: MessageEvent<DeckMessage>) => handler.current(event.data);
    channel.current = bc;
    return () => {
      bc.close();
      channel.current = null;
    };
  }, []);

  return (message: DeckMessage) => {
    if (!channel.current) throw new Error("Deck channel used before it opened");
    channel.current.postMessage(message);
  };
}

/** Slide numbers in the address are 1-based (#12 is the twelfth slide). */
export function slideFromHash(count: number): number | null {
  const match = window.location.hash.match(/^#(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (n < 1 || n > count) return null;
  return n - 1;
}

export function writeSlideToHash(index: number) {
  const hash = `#${index + 1}`;
  if (window.location.hash !== hash) history.replaceState(null, "", hash);
}

// Remembered per browser so closing the tab, visiting another site, or a
// reload mid-talk all land back on the same slide.
export function rememberSlide(index: number) {
  try {
    localStorage.setItem(LAST_SLIDE_KEY, String(index));
  } catch (error) {
    console.warn("[talk] could not remember slide", error);
  }
}

export function recallSlide(count: number): number | null {
  try {
    const raw = localStorage.getItem(LAST_SLIDE_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n < count ? n : null;
  } catch (error) {
    console.warn("[talk] could not recall slide", error);
    return null;
  }
}
