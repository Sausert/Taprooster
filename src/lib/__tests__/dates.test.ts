import { describe, it, expect } from "vitest";
import { parseLocalDate, toLocalDateStr, addDays, formatDate } from "../dates";

describe("parseLocalDate", () => {
  it("parses a date string without timezone offset", () => {
    const d = parseLocalDate("2025-01-15");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(15);
  });

  it("does not shift date by UTC offset", () => {
    // new Date("2025-01-15") in UTC+0 environments stays Jan 15,
    // but in UTC+1 environments parseLocalDate must still return Jan 15
    const d = parseLocalDate("2025-01-15");
    expect(d.getDate()).toBe(15);
  });

  it("handles month boundary correctly (Dec 31)", () => {
    const d = parseLocalDate("2024-12-31");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(31);
  });

  it("handles Feb 28 in non-leap year", () => {
    const d = parseLocalDate("2025-02-28");
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
  });

  it("handles Feb 29 in leap year", () => {
    const d = parseLocalDate("2024-02-29");
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(29);
  });
});

describe("toLocalDateStr", () => {
  it("formats date back to YYYY-MM-DD", () => {
    const d = new Date(2025, 4, 7); // May 7, 2025
    expect(toLocalDateStr(d)).toBe("2025-05-07");
  });

  it("pads month and day", () => {
    const d = new Date(2025, 0, 1); // Jan 1
    expect(toLocalDateStr(d)).toBe("2025-01-01");
  });

  it("round-trips with parseLocalDate", () => {
    const original = "2025-11-30";
    expect(toLocalDateStr(parseLocalDate(original))).toBe(original);
  });
});

describe("addDays", () => {
  it("adds days across month boundary", () => {
    const d = new Date(2025, 0, 30); // Jan 30
    const result = addDays(d, 3);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(2);
  });

  it("adds days across year boundary", () => {
    const d = new Date(2024, 11, 30); // Dec 30, 2024
    const result = addDays(d, 3);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(2);
  });

  it("adding 14 days from today returns correct date", () => {
    const today = new Date(2025, 4, 1); // May 1
    const result = addDays(today, 14);
    expect(toLocalDateStr(result)).toBe("2025-05-15");
  });
});

describe("formatDate", () => {
  it("returns a non-empty string", () => {
    expect(formatDate("2025-05-15")).toBeTruthy();
  });

  it("does not shift the date", () => {
    // The formatted date should contain the correct day number
    const result = formatDate("2025-05-15");
    expect(result).toContain("15");
  });
});
