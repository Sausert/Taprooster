import { describe, it, expect } from "vitest";
import { generateSchedule } from "../scheduler";
import type { Profile, Shift, ShiftAssignment } from "@/types";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    full_name: "Test Tapper",
    email: "test@example.com",
    role: "tapper",
    preferred_frequency: 3,
    preferred_days: [],
    preferred_roles: ["tapper"],
    wants_parties: false,
    unavailable_months: [],
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  } as Profile;
}

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: "shift-1",
    title: "Tapavond Vrijdag",
    date: "2025-05-16",
    start_time: "20:00",
    end_time: "23:00",
    type: "tapavond",
    role: "tapper",
    max_tappers: 2,
    status: "concept",
    created_by: "admin-1",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  } as Shift;
}

describe("generateSchedule", () => {
  it("returns empty array when no shifts", () => {
    const result = generateSchedule({ profiles: [makeProfile()], shifts: [], existingAssignments: [] });
    expect(result).toEqual([]);
  });

  it("returns empty array when no profiles", () => {
    const result = generateSchedule({ profiles: [], shifts: [makeShift()], existingAssignments: [] });
    expect(result).toEqual([]);
  });

  it("assigns an eligible user to an open shift", () => {
    const profile = makeProfile({ id: "user-1" });
    const shift = makeShift({ id: "shift-1", max_tappers: 1 });
    const result = generateSchedule({ profiles: [profile], shifts: [shift], existingAssignments: [] });
    expect(result).toHaveLength(1);
    expect(result[0].shiftId).toBe("shift-1");
    expect(result[0].userId).toBe("user-1");
  });

  it("does not exceed max_tappers", () => {
    const profiles = [
      makeProfile({ id: "user-1" }),
      makeProfile({ id: "user-2", email: "user2@test.com" }),
      makeProfile({ id: "user-3", email: "user3@test.com" }),
    ];
    const shift = makeShift({ id: "shift-1", max_tappers: 2 });
    const result = generateSchedule({ profiles, shifts: [shift], existingAssignments: [] });
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("does not double-book a user on the same day", () => {
    const profile = makeProfile({ id: "user-1" });
    const shift1 = makeShift({ id: "shift-1", date: "2025-05-16", max_tappers: 1 });
    const shift2 = makeShift({ id: "shift-2", date: "2025-05-16", max_tappers: 1 });
    const result = generateSchedule({ profiles: [profile], shifts: [shift1, shift2], existingAssignments: [] });
    const userAssignments = result.filter(r => r.userId === "user-1");
    expect(userAssignments.length).toBeLessThanOrEqual(1);
  });

  it("respects preferred_days — skips user if day not preferred", () => {
    // Friday = day 5 in JS, our enum = "friday"
    const profile = makeProfile({ id: "user-1", preferred_days: ["wednesday"] });
    const shift = makeShift({ id: "shift-1", date: "2025-05-16", max_tappers: 1 }); // May 16 = Friday
    const result = generateSchedule({ profiles: [profile], shifts: [shift], existingAssignments: [] });
    expect(result.filter(r => r.userId === "user-1")).toHaveLength(0);
  });

  it("assigns user when preferred_days is empty (no restriction)", () => {
    const profile = makeProfile({ id: "user-1", preferred_days: [] });
    const shift = makeShift({ id: "shift-1", date: "2025-05-16", max_tappers: 1 }); // Friday
    const result = generateSchedule({ profiles: [profile], shifts: [shift], existingAssignments: [] });
    expect(result.filter(r => r.userId === "user-1")).toHaveLength(1);
  });

  it("respects unavailable_months", () => {
    // May = month index 4
    const profile = makeProfile({ id: "user-1", unavailable_months: [4] });
    const shift = makeShift({ id: "shift-1", date: "2025-05-16", max_tappers: 1 });
    const result = generateSchedule({ profiles: [profile], shifts: [shift], existingAssignments: [] });
    expect(result.filter(r => r.userId === "user-1")).toHaveLength(0);
  });

  it("respects quarterly frequency limit", () => {
    const profile = makeProfile({ id: "user-1", preferred_frequency: 1 });
    const existingShift = makeShift({ id: "shift-existing", date: "2025-04-01", max_tappers: 1 });
    const existingAssignment: ShiftAssignment = {
      id: "assign-1",
      shift_id: "shift-existing",
      user_id: "user-1",
      status: "confirmed",
      created_at: "2025-01-01T00:00:00Z",
    };
    // New shift in same quarter (Q2: Apr-Jun)
    const newShift = makeShift({ id: "shift-1", date: "2025-05-16", max_tappers: 1 });
    const result = generateSchedule({
      profiles: [profile],
      shifts: [newShift],
      existingAssignments: [existingAssignment],
      // contextShifts includes the existing published shift so quota counting works across periods
      contextShifts: [existingShift],
    });
    // User already at frequency limit for Q2, should not be assigned
    expect(result.filter(r => r.userId === "user-1")).toHaveLength(0);
  });

  it("does not assign user to feestje if wants_parties is false", () => {
    const profile = makeProfile({ id: "user-1", wants_parties: false });
    const shift = makeShift({ id: "shift-1", type: "feestje", max_tappers: 1 });
    const result = generateSchedule({ profiles: [profile], shifts: [shift], existingAssignments: [] });
    expect(result.filter(r => r.userId === "user-1")).toHaveLength(0);
  });

  it("skips shift if already fully assigned", () => {
    const profile = makeProfile({ id: "user-1" });
    const shift = makeShift({ id: "shift-1", max_tappers: 1 });
    const existingAssignment: ShiftAssignment = {
      id: "assign-1",
      shift_id: "shift-1",
      user_id: "user-2",
      status: "assigned",
      created_at: "2025-01-01T00:00:00Z",
    };
    const result = generateSchedule({
      profiles: [profile],
      shifts: [shift],
      existingAssignments: [existingAssignment],
    });
    expect(result).toHaveLength(0);
  });
});
