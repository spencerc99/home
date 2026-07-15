// ABOUTME: Shared constants and utilities for playhtml presence detection.
// ABOUTME: Provides Spencer identity checks used across Stats, Chat, and CursorPresenceLayer.

import type { CursorPresenceView } from "@playhtml/common";

export const SPENCER_COLOR = "hsl(41, 100%, 50%)";

export const SPENCER_IDS = [
  "pk_04934976d2bc13f0a3a1e62a9124a3edb1e236b2eef64b618c646e25e3ade8ec77d2b56bedb39b78150d141be1b6b41a85b86010930941e02e82e96ce61af35d53",
  "pk_0494b0d6b651671ea6ac0e8540b77f622ef971834e4e4a3d540ea78860b1fcd982a37c5a306070303b7869542697f06987987e51980c08b5f3237dd0fee64dfbe1",
];
export const VISITOR_AWAY_DELAY_MS = 30_000;

export type SpencerChatStatus = "absent" | "home" | "away";
export type VisitorAvailability = "available" | "away";

export function isSpencer(presence: CursorPresenceView): boolean {
  if (!SPENCER_IDS.includes(presence.playerIdentity?.publicKey)) return false;
  return true;
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
