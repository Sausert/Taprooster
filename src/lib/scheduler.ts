// lib/scheduler.ts — Strict availability + rotation scheduler
import type { Profile, Shift, ShiftAssignment } from "@/types";
import { APP_CONFIG } from "@/lib/config";
import { parseLocalDate } from "@/lib/dates";

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
  // Optional broader set of shifts for quota counting (includes previously published shifts).
  // When omitted, falls back to `shifts` (which may undercount cross-period assignments).
  contextShifts?: Shift[];
}


function getDayOfWeek(dateStr: string): DayOfWeek | null {
  const day = parseLocalDate(dateStr).getDay();
  if (day === 3) return "wednesday";
  if (day === 5) return "friday";
  if (day === 6) return "saturday";
  return null;
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function getMonthIndex(dateStr: string): number {
  return parseLocalDate(dateStr).getMonth();
}

// Get ISO week number for rotation tracking
function getWeekNumber(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
}

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

function getQuarterKey(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function countUserShiftsInQuarter(
  userId: string,
  quarterKey: string,
  assignments: ShiftAssignment[],
  allShifts: Shift[]
): number {
  return assignments.filter(a => {
    if (a.user_id !== userId || a.status === "declined") return false;
    const shift = allShifts.find(s => s.id === a.shift_id);
    return shift && getQuarterKey(shift.date) === quarterKey;
  }).length;
}

function countUserShiftsThisYear(
  userId: string,
  assignments: ShiftAssignment[],
  allShifts: Shift[]
): number {
  const thisYear = new Date().getFullYear();
  return assignments.filter(a => {
    if (a.user_id !== userId || a.status === "declined") return false;
    const shift = allShifts.find(s => s.id === a.shift_id);
    return shift && parseLocalDate(shift.date).getFullYear() === thisYear;
  }).length;
}

// How many times has user been on the same day-of-week in recent weeks (rotation check)
function countRecentSameDayAssignments(
  userId: string,
  shiftDate: string,
  weekNum: number,
  assignments: ShiftAssignment[],
  allShifts: Shift[]
): number {
  const dayOfWeek = parseLocalDate(shiftDate).getDay();
  return assignments.filter(a => {
    if (a.user_id !== userId || a.status === "declined") return false;
    const shift = allShifts.find(s => s.id === a.shift_id);
    if (!shift) return false;
    const shiftWeek = getWeekNumber(shift.date);
    const shiftDay = parseLocalDate(shift.date).getDay();
    // Count same day-of-week assignments in the last 4 weeks
    return shiftDay === dayOfWeek && Math.abs(shiftWeek - weekNum) <= 4 && shiftWeek < weekNum;
  }).length;
}

function isUserEligible(
  user: Profile,
  shift: Shift,
  allShifts: Shift[],
  allAssignments: ShiftAssignment[]
): { eligible: boolean; reason: string } {
  // 1. Unavailable months
  const monthIdx = getMonthIndex(shift.date);
  const unavailableMonths: number[] = (user as any).unavailable_months || [];
  if (unavailableMonths.includes(monthIdx)) {
    return { eligible: false, reason: `Niet beschikbaar in maand ${monthIdx + 1}` };
  }

  // 2. Preferred days — STRICT
  const shiftDay = getDayOfWeek(shift.date);
  if (shiftDay && user.preferred_days.length > 0 && !user.preferred_days.includes(shiftDay)) {
    return { eligible: false, reason: `Niet beschikbaar op ${shiftDay}` };
  }

  // 3. Party preference — STRICT
  if (shift.type === "feestje" && !user.wants_parties) {
    return { eligible: false, reason: "Geen feestjesvoorkeur" };
  }

  // 4. Role preference — STRICT for bonnenkassa
  if (shift.role === "bonnenkassa" && !(user.preferred_roles || []).includes("bonnenkassa")) {
    return { eligible: false, reason: "Geen bonnenkassa voorkeur" };
  }

  // 5. Quarterly frequency limit — HARD CAP (most important!)
  const quarterKey = getQuarterKey(shift.date);
  const shiftsThisQuarter = countUserShiftsInQuarter(user.id, quarterKey, allAssignments, allShifts);
  if (shiftsThisQuarter >= user.preferred_frequency) {
    return { eligible: false, reason: `Kwartaallimiet bereikt: ${shiftsThisQuarter}/${user.preferred_frequency}` };
  }

  // 6. No double-booking on same day
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
  const weekNum = getWeekNumber(shift.date);

  // Fairness: users with more remaining quota get priority
  const quarterKey = getQuarterKey(shift.date);
  const shiftsThisQuarter = countUserShiftsInQuarter(user.id, quarterKey, allAssignments, allShifts);
  const remaining = user.preferred_frequency - shiftsThisQuarter;
  score += remaining * 15; // More remaining = higher priority

  // Fairness: users who have tapped less this year get priority
  const yearTotal = countUserShiftsThisYear(user.id, allAssignments, allShifts);
  score -= yearTotal * 3;

  // ROTATION: penalise users who have worked the same day-of-week recently
  const recentSameDay = countRecentSameDayAssignments(user.id, shift.date, weekNum, allAssignments, allShifts);
  score -= recentSameDay * 25; // Strong penalty for same day repeatedly

  // ROTATION: bonus for users who haven't worked recently at all
  const recentAnyShifts = allAssignments.filter(a => {
    if (a.user_id !== user.id || a.status === "declined") return false;
    const s = allShifts.find(x => x.id === a.shift_id);
    if (!s) return false;
    const sw = getWeekNumber(s.date);
    return Math.abs(sw - weekNum) <= 2 && sw < weekNum;
  }).length;
  score -= recentAnyShifts * 10; // Penalty for working every week

  return score;
}

export function generateSchedule(input: ScheduleInput): AssignmentSuggestion[] {
  const { profiles, shifts, existingAssignments } = input;
  // Use contextShifts for quota counting so cross-period assignments are included
  const allShiftsForContext = input.contextShifts
    ? [...input.contextShifts, ...shifts.filter(s => !input.contextShifts!.some(c => c.id === s.id))]
    : shifts;
  const suggestions: AssignmentSuggestion[] = [];
  const tempAssignments = [...existingAssignments];

  const sortedShifts = [...shifts].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  for (const shift of sortedShifts) {
    const alreadyAssigned = tempAssignments.filter(
      a => a.shift_id === shift.id && a.status !== "declined"
    ).length;
    const spotsNeeded = shift.max_tappers - alreadyAssigned;
    if (spotsNeeded <= 0) continue;

    // Get eligible users and score them
    const eligible = profiles
      .filter(p => !tempAssignments.some(a => a.shift_id === shift.id && a.user_id === p.id))
      .map(p => {
        const { eligible, reason } = isUserEligible(p, shift, allShiftsForContext, tempAssignments);
        if (!eligible) return null;
        const score = scoreUser(p, shift, allShiftsForContext, tempAssignments);
        return { userId: p.id, score };
      })
      .filter((x): x is { userId: string; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);

    // Only assign eligible — leave empty if not enough eligible users
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

export function generateICalEvent(shift: Shift): string {
  const d = parseLocalDate(shift.date);
  const fmt = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${d.getFullYear()}${fmt(d.getMonth()+1)}${fmt(d.getDate())}`;
  const startStr = shift.start_time.replace(/:/g, "").slice(0, 4);
  const endStr = shift.end_time.replace(/:/g, "").slice(0, 4);
  // Shifts ending past midnight get DTEND on the next day
  const endDate = endStr < startStr
    ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    : d;
  const endDateStr = `${endDate.getFullYear()}${fmt(endDate.getMonth()+1)}${fmt(endDate.getDate())}`;
  return [
    `BEGIN:VCALENDAR`, "VERSION:2.0", `PRODID:-//${APP_CONFIG.orgName}//Taprooster//NL`,
    "BEGIN:VEVENT",
    `UID:shift-${shift.id}@${APP_CONFIG.domain}`,
    `DTSTART:${dateStr}T${startStr}00`,
    `DTEND:${endDateStr}T${endStr}00`,
    `SUMMARY:🍺 ${shift.title}`,
    `LOCATION:${APP_CONFIG.locationIcal}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
