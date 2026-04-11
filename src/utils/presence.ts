// ABOUTME: Shared constants and utilities for playhtml presence detection.
// ABOUTME: Provides Spencer identity checks used across Stats, Chat, and CursorPresenceLayer.

import type { CursorPresenceView } from "@playhtml/common";

export const SPENCER_COLOR = "hsl(41, 100%, 50%)";

export function isSpencer(presence: CursorPresenceView): boolean {
  return (
    presence.playerIdentity?.name === "spencer" &&
    presence.playerIdentity?.playerStyle.colorPalette[0] === SPENCER_COLOR
  );
}

export function getSpencerStableId(
  presences: Map<string, CursorPresenceView>,
): string | null {
  for (const [stableId, presence] of presences) {
    if (isSpencer(presence)) return stableId;
  }
  return null;
}
