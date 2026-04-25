// ABOUTME: Nanostore atoms for live chat state.
// ABOUTME: Lives outside React so state survives component re-mounts during Astro view transitions.

import { atom } from "nanostores";

interface ChatMessage {
  id: string;
  text: string;
  stableId: string;
  color: string;
  name?: string;
  timestamp: number;
  type: "message" | "system";
}

export type { ChatMessage };

export const $chatMessages = atom<ChatMessage[]>([]);
export const $chatVisible = atom(false);
export const $chatMinimized = atom(false);
export const $chatSpencerLeft = atom(false);
export const $chatUnreadCount = atom(0);
export const $chatDismissed = atom(false);
