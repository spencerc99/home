// ABOUTME: Unit tests for live chat behavior helpers.
// ABOUTME: Covers scroll decisions used by the chat message pane.

import { describe, expect, test } from "bun:test";
import { isScrolledNearBottom } from "../src/utils/chat";

describe("isScrolledNearBottom", () => {
  test("returns true when the scroll position is at the bottom", () => {
    expect(isScrolledNearBottom(700, 300, 1000)).toBe(true);
  });

  test("returns true when the scroll position is within the threshold", () => {
    expect(isScrolledNearBottom(676, 300, 1000)).toBe(true);
  });

  test("returns false when the user has scrolled away from the bottom", () => {
    expect(isScrolledNearBottom(500, 300, 1000)).toBe(false);
  });
});
