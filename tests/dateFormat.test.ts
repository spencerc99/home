// ABOUTME: Unit tests for compact date range formatting.
// ABOUTME: Covers event date labels shown in upcoming and event lists.
import { describe, expect, test } from "bun:test";
import { formatCompactDateRange } from "../src/utils";

const date = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

describe("formatCompactDateRange", () => {
  test("keeps days for same-year event ranges", () => {
    expect(formatCompactDateRange(date(2030, 11, 10), date(2030, 12, 12))).toBe(
      "11/10-12/12/30",
    );
  });

  test("shows only months and years for event ranges spanning years", () => {
    expect(formatCompactDateRange(date(2026, 9, 4), date(2027, 4, 6))).toBe(
      "9/26-4/27",
    );
  });
});
