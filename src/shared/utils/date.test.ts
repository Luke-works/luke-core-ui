import { describe, it, expect } from "vitest";
import { toCamundaDate } from "./date";

describe("toCamundaDate", () => {
  it("returns undefined for empty/invalid input", () => {
    expect(toCamundaDate(null)).toBeUndefined();
    expect(toCamundaDate(undefined)).toBeUndefined();
    expect(toCamundaDate("")).toBeUndefined();
    expect(toCamundaDate("not-a-date")).toBeUndefined();
  });

  it("formats with a numeric offset and NO trailing Z (Camunda rejects Z)", () => {
    const out = toCamundaDate(new Date("2026-01-02T03:04:05.678Z"));
    expect(out).toBeDefined();
    // yyyy-MM-ddTHH:mm:ss.SSS then +hhmm / -hhmm — timezone-agnostic shape check.
    expect(out!).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/);
    expect(out!.endsWith("Z")).toBe(false);
  });

  it("accepts a string date", () => {
    expect(toCamundaDate("2026-01-02T03:04:05")).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
