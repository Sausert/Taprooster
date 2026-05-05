// lib/scheduler.ts — Strict availability-based scheduler
import type { Profile, Shift, ShiftAssignment } from "@/types";

type DayOfWeek = "wednesday" | "friday" | "saturday";

export interface AssignmentSuggestion {
  shiftId: string;
  userId: string;
  score: number;
  reasons: string[];
}

interface ScheduleInput {
  profiles: Profile[];
  shifts: Shift[];
  existingAssignments: ShiftAssignment[];
}

// Timezone-safe date parsing
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayOfWeek(dateStr: string): DayOfWeek | null {
  const day = parseLocalDate(dateStr).getDay();
  if (day === 3) return "wednesday";
  if (day === 5) return "friday";
  if (day === 6) return "saturday";
  return null;
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7); // "2025-05"
}

function getMonthIndex(dateStr: string): number {
  return parseLocalDate(dateStr).getMonth(); // 0-11
}

// Count shifts already assigned to user in a given month
function countUserShiftsInMonth(
  userId: string,
  monthKey: string,
  assignments: ShiftAssignment[],
  allShifts: Shift[]
): number {
  return assignments.filter(a => {
    if (a.user_id !== userId || a.status === "declined") return false;
    const shift = allShifts.find(s => s.id === a.shift_id);
    return shift && getMonthKey(shift.date) === monthKey;
  }).length;
}

function isUserEligible(
  user: Profile,
  shift: Shift,
  allShifts: Shift[],
  allAssignments: ShiftAssignment[]
): { eligible: boolean; reason: string } {
  // 1. Check unavailable months
  const monthIdx = getMonthIndex(shift.date);
  const unavailableMonths: number[] = (user as any).unavailable_months || [];
  if (unavailableMonths.includes(monthIdx)) {
    return { eligible: false, reason: `Niet beschikbaar in maand ${monthIdx + 1}` };
  }

  // 2. Check preferred days — STRICT: never assign on non-preferred days
  const shiftDay = getDayOfWeek(shift.date);
  if (shiftDay && user.preferred_days.length > 0 && !user.preferred_days.includes(shiftDay)) {
    return { eligible: false, reason: `Niet beschikbaar op ${shiftDay}` };
  }

  // 3. Check feestje preference — STRICT
  if (shift.type === "feestje" && !user.wants_parties) {
    return { eligible: false, reason: "Geen feestjesvoorkeur" };
  }

  // 4. Check role preference — STRICT for bonnenkassa
  if (shift.role === "bonnenkassa" && !user.preferred_roles.includes("bonnenkassa")) {
    return { eligible: false, reason: "Geen bonnenkassa voorkeur" };
  }

  // 5. Check monthly frequency limit — STRICT
  const monthKey = getMonthKey(shift.date);
  const shiftsThisMonth = countUserShiftsInMonth(user.id, monthKey, allAssignments, allShifts);
  if (shiftsThisMonth >= user.preferred_frequency) {
    return { eligible: false, reason: `Maandlimiet bereikt (${user.preferred_frequency}x)` };
  }

  // 6. Check same day — never double-book
  const alreadyThatDay = allAssignments.some(a => {
    if (a.user_id !== user.id || a.status === "declined") return false;
    const s = allShifts.find(x => x.id === a.shift_id);
    return s?.date === shift.date;
  });
  if (alreadyThatDay) {
    return { eligible: false, reason: "Al ingepland op deze dag" };
  }

  return { eligible: true, reason: "" };
}

function scoreUser(
  user: Profile,
  shift: Shift,
  allShifts: Shift[],
  allAssignments: ShiftAssignment[]
): number {
  let score = 100;

  // Prefer users further from their monthly goal (fairness)
  const monthKey = getMonthKey(shift.date);
  const shiftsThisMonth = countUserShiftsInMonth(user.id, monthKey, allAssignments, allShifts);
  const remaining = user.preferred_frequency - shiftsThisMonth;
  score += remaining * 10; // More remaining = higher priority

  // Prefer users who have tapped less overall this year (fairness)
  const thisYear = new Date().getFullYear();
  const yearShifts = allAssignments.filter(a => {
    if (a.user_id !== user.id || a.status === "declined") return false;
    const s = allShifts.find(x => x.id === a.shift_id);
    return s && parseLocalDate(s.date).getFullYear() === thisYear;
  }).length;
  score -= yearShifts * 2;

  return score;
}

export function generateSchedule(input: ScheduleInput): AssignmentSuggestion[] {
  const { profiles, shifts, existingAssignments } = input;
  const suggestions: AssignmentSuggestion[] = [];
  const tempAssignments = [...existingAssignments];

  // Sort shifts by date
  const sortedShifts = [...shifts].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  for (const shift of sortedShifts) {
    const alreadyAssigned = tempAssignments.filter(
      a => a.shift_id === shift.id && a.status !== "declined"
    ).length;
    const spotsNeeded = shift.max_tappers - alreadyAssigned;
    if (spotsNeeded <= 0) continue;

    // Filter eligible users and score them
    const eligible = profiles
      .filter(p => !tempAssignments.some(a => a.shift_id === shift.id && a.user_id === p.id))
      .map(p => {
        const { eligible, reason } = isUserEligible(p, shift, shifts, tempAssignments);
        if (!eligible) return null;
        const score = scoreUser(p, shift, shifts, tempAssignments);
        return { userId: p.id, score, reason: "" };
      })
      .filter((x): x is { userId: string; score: number; reason: string } => x !== null)
      .sort((a, b) => b.score - a.score);

    // Only assign eligible users — if not enough, leave spots empty
    const picked = eligible.slice(0, spotsNeeded);

    for (const pick of picked) {
      suggestions.push({ shiftId: shift.id, userId: pick.userId, score: pick.score, reasons: [] });
      tempAssignments.push({
        id: `temp-${shift.id}-${pick.userId}`,
        shift_id: shift.id,
        user_id: pick.userId,
        status: "assigned",
        created_at: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

// iCal export helper
export function generateICalEvent(shift: Shift): string {
  const d = parseLocalDate(shift.date);
  const fmt = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${d.getFullYear()}${fmt(d.getMonth()+1)}${fmt(d.getDate())}`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OJC Walhalla//Taprooster//NL",
    "BEGIN:VEVENT",
    `UID:shift-${shift.id}@ojcwalhalla.nl`,
    `DTSTART:${dateStr}T${shift.start_time.replace(":","")}00`,
    `DTEND:${dateStr}T${shift.end_time.replace(":","")}00`,
    `SUMMARY:🍺 ${shift.title}`,
    "LOCATION:De Donckstraat 24/26\\, 5975 AC Sevenum",
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
