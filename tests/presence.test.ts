// ABOUTME: Unit tests for shared playhtml presence detection helpers.
// ABOUTME: Covers Spencer identity and chat availability status decisions.

import { describe, expect, test } from "bun:test";
import type { CursorPresenceView } from "@playhtml/common";
import {
  SPENCER_COLOR,
  VISITOR_AWAY_DELAY_MS,
  getSpencerChatStatus,
  getVisitorAvailability,
} from "../src/utils/presence";

function presence(name: string, color: string): CursorPresenceView {
  return {
    playerIdentity: {
      name,
      publicKey: `${name}-key`,
      playerStyle: {
        colorPalette: [color],
      },
    },
  } as CursorPresenceView;
}

describe("getSpencerChatStatus", () => {
  test("returns absent when Spencer is not present", () => {
    const presences = new Map<string, CursorPresenceView>([
      ["visitor-key", presence("visitor", "#888")],
    ]);

    expect(getSpencerChatStatus(presences, new Map())).toBe("absent");
  });

  test("returns home when Spencer is present and active", () => {
    const presences = new Map<string, CursorPresenceView>([
      ["spencer-key", presence("spencer", SPENCER_COLOR)],
    ]);
    const activePresences = new Map<string, { active?: boolean }>([
      ["spencer-key", { active: true }],
    ]);

    expect(getSpencerChatStatus(presences, activePresences)).toBe("home");
  });

  test("returns away when Spencer is present and inactive", () => {
    const presences = new Map<string, CursorPresenceView>([
      ["spencer-key", presence("spencer", SPENCER_COLOR)],
    ]);
    const activePresences = new Map<string, { active?: boolean }>([
      ["spencer-key", { active: false }],
    ]);

    expect(getSpencerChatStatus(presences, activePresences)).toBe("away");
  });

  test("returns home when Spencer is present without active presence data", () => {
    const presences = new Map<string, CursorPresenceView>([
      ["spencer-key", presence("spencer", SPENCER_COLOR)],
    ]);

    expect(getSpencerChatStatus(presences, new Map())).toBe("home");
  });
});

describe("getVisitorAvailability", () => {
  test("returns available while the page is visible", () => {
    expect(getVisitorAvailability(false, null, null, 1000)).toBe("available");
  });

  test("returns available before the away delay has elapsed", () => {
    expect(
      getVisitorAvailability(
        true,
        1000,
        null,
        1000 + VISITOR_AWAY_DELAY_MS - 1,
      ),
    ).toBe("available");
  });

  test("returns away after the away delay has elapsed", () => {
    expect(
      getVisitorAvailability(true, 1000, null, 1000 + VISITOR_AWAY_DELAY_MS),
    ).toBe("away");
  });

  test("returns available when another tab was visible recently", () => {
    expect(
      getVisitorAvailability(
        true,
        1000,
        1000 + VISITOR_AWAY_DELAY_MS,
        1000 + VISITOR_AWAY_DELAY_MS + 1,
      ),
    ).toBe("available");
  });
});
