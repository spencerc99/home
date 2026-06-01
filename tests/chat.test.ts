// ABOUTME: Unit tests for live chat text helpers.
// ABOUTME: Covers reply mention draft behavior used by the chat input.

import { describe, expect, test } from "bun:test";
import { startReplyDraft } from "../src/utils/chat";

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
