// ABOUTME: Unit tests for playhtml readiness decisions used by React islands.
// ABOUTME: Covers the extra confirmation needed before mounting playhtml consumers.

import { describe, expect, test } from "bun:test";
import { isPlayhtmlReadyForConsumers } from "../src/utils/playhtmlReady";

describe("isPlayhtmlReadyForConsumers", () => {
  test("waits for a confirmed synced render", () => {
    expect(isPlayhtmlReadyForConsumers(false, false)).toBe(false);
    expect(isPlayhtmlReadyForConsumers(true, false)).toBe(false);
    expect(isPlayhtmlReadyForConsumers(true, true)).toBe(true);
  });
});
