// ABOUTME: Unit tests for live chat text helpers.
// ABOUTME: Covers reply mention draft behavior used by the chat input.

import { describe, expect, test } from "bun:test";
import { isScrolledNearBottom, startReplyDraft } from "../src/utils/chat";

describe("startReplyDraft", () => {
  test("starts an empty draft with a reply mention", () => {
    expect(startReplyDraft("", "spencer")).toBe("@spencer ");
  });

  test("prepends a reply mention to an existing draft", () => {
    expect(startReplyDraft("hello", "spencer")).toBe("@spencer hello");
  });

  test("does not duplicate the same reply mention", () => {
    expect(startReplyDraft("@spencer hello", "spencer")).toBe("@spencer hello");
  });

  test("uses someone when the message has no name", () => {
    expect(startReplyDraft("", undefined)).toBe("@someone ");
  });
});

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
