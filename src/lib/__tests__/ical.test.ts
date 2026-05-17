import { describe, it, expect } from "vitest";
import { generateICalEvent } from "../scheduler";
import type { Shift } from "@/types";

function makeShift(overrides: Partial<Shift> = {}): Shift & Record<string, unknown> {
  return {
    id: "test-id",
    title: "Tapavond Vrijdag",
    date: "2025-05-16",
    start_time: "20:00",
    end_time: "23:00",
    type: "tapavond",
    role: "tapper",
    max_tappers: 2,
    status: "published",
    created_by: "user-1",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  } as Shift & Record<string, unknown>;
}

describe("generateICalEvent", () => {
  it("produces valid VCALENDAR wrapper", () => {
    const ics = generateICalEvent(makeShift());
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("sets DTSTART correctly for normal evening shift", () => {
    const ics = generateICalEvent(makeShift({ date: "2025-05-16", start_time: "20:00" }));
    expect(ics).toContain("DTSTART:20250516T200000");
  });

  it("sets DTEND on same day when shift ends before midnight", () => {
    const ics = generateICalEvent(makeShift({ date: "2025-05-16", start_time: "20:00", end_time: "23:00" }));
    expect(ics).toContain("DTEND:20250516T230000");
  });

  it("sets DTEND on NEXT day when shift ends past midnight", () => {
    const ics = generateICalEvent(makeShift({ date: "2025-05-16", start_time: "20:00", end_time: "02:00" }));
    // End time 02:00 is before start time 20:00 → next day = 2025-05-17
    expect(ics).toContain("DTEND:20250517T020000");
    expect(ics).not.toContain("DTEND:20250516T020000");
  });

  it("handles midnight shift ending on next day across month boundary", () => {
    const ics = generateICalEvent(makeShift({ date: "2025-05-31", start_time: "22:00", end_time: "01:00" }));
    expect(ics).toContain("DTEND:20250601T010000");
  });

  it("handles midnight shift ending on next day across year boundary", () => {
    const ics = generateICalEvent(makeShift({ date: "2024-12-31", start_time: "22:00", end_time: "03:00" }));
    expect(ics).toContain("DTEND:20250101T030000");
  });

  it("includes shift title in SUMMARY", () => {
    const ics = generateICalEvent(makeShift({ title: "Tapavond Zaterdag" }));
    expect(ics).toContain("Tapavond Zaterdag");
  });

  it("uses CRLF line endings as required by RFC 5545", () => {
    const ics = generateICalEvent(makeShift());
    expect(ics).toContain("\r\n");
  });
});
