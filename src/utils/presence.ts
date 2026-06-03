// ABOUTME: Shared constants and utilities for playhtml presence detection.
// ABOUTME: Provides Spencer identity checks used across Stats, Chat, and CursorPresenceLayer.

import type { CursorPresenceView } from "@playhtml/common";

export const SPENCER_COLOR = "hsl(41, 100%, 50%)";
export const VISITOR_AWAY_DELAY_MS = 30_000;

export type SpencerChatStatus = "absent" | "home" | "away";
export type VisitorAvailability = "available" | "away";

let normalizedSpencerColor: string | null = null;

function normalizeColor(color: string): string {
  if (typeof document === "undefined") return color;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return color;
  ctx.fillStyle = color;
  return ctx.fillStyle;
}

function getSpencerColorHex(): string {
  if (!normalizedSpencerColor) {
    normalizedSpencerColor = normalizeColor(SPENCER_COLOR);
  }
  return normalizedSpencerColor;
}

export function isSpencer(presence: CursorPresenceView): boolean {
  const color = presence.playerIdentity?.playerStyle.colorPalette[0];
  if (!color || presence.playerIdentity?.name !== "spencer") return false;
  return normalizeColor(color) === getSpencerColorHex();
}

export function getSpencerStableId(
  presences: Map<string, CursorPresenceView>,
): string | null {
  for (const [stableId, presence] of presences) {
    if (isSpencer(presence)) return stableId;
  }
  return null;
}

export function getSpencerChatStatus(
  presences: Map<string, CursorPresenceView>,
  activePresences: Map<string, { active?: boolean }>,
): SpencerChatStatus {
  const stableId = getSpencerStableId(presences);
  if (!stableId) return "absent";

  return activePresences.get(stableId)?.active === false ? "away" : "home";
}

export function getVisitorAvailability(
  isHidden: boolean,
  hiddenSince: number | null,
  lastVisibleAt: number | null,
  now = Date.now(),
): VisitorAvailability {
  if (!isHidden) return "available";
  if (hiddenSince === null) return "available";
  if (now - hiddenSince < VISITOR_AWAY_DELAY_MS) return "available";
  if (lastVisibleAt !== null && now - lastVisibleAt < VISITOR_AWAY_DELAY_MS) {
    return "available";
  }
  return "away";
}
