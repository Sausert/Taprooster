// lib/scheduler.ts — Automatisch rooster genereren met tapper voorkeuren
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

// Parse date string without timezone offset (avoids UTC shift bug)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayOfWeek(dateStr: string): DayOfWeek | null {
  const day = parseLocalDate(dateStr).getDay(); // 0=Sun,3=Wed,5=Fri,6=Sat
  if (day === 3) return "wednesday";
  if (day === 5) return "friday";
  if (day === 6) return "saturday";
  return null;
}

function getMonthKey(dateStr: string): string {
  // Returns "2025-05" from "2025-05-14"
  return dateStr.substring(0, 7);
}

// Hoeveel diensten heeft een user al in een specifieke maand
function countUserShiftsInMonth(
  userId: string,
  monthKey: string,
  assignments: ShiftAssignment[],
  shifts: Shift[]
): number {
  return assignments.filter((a) => {
    if (a.user_id !== userId || a.status === "declined") return false;
    const shift = shifts.find((s) => s.id === a.shift_id);
    return shift && getMonthKey(shift.date) === monthKey;
  }).length;
}

// Hoeveel diensten heeft een user al dit jaar
function countUserShiftsThisYear(userId: string, assignments: ShiftAssignment[], shifts: Shift[]): number {
  const thisYear = new Date().getFullYear();
  return assignments.filter((a) => {
    if (a.user_id !== userId || a.status === "declined") return false;
    const shift = shifts.find((s) => s.id === a.shift_id);
    return shift && parseLocalDate(shift.date).getFullYear() === thisYear;
  }).length;
}

function scoreUserForShift(
  user: Profile,
  shift: Shift,
  allShifts: Shift[],
  allAssignments: ShiftAssignment[]
): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];

  // ── Feestje voorkeur ──
  if (shift.type === "feestje" && !user.wants_parties) {
    score -= 999; // Hard uitsluiten als geen feestjes voorkeur
    reasons.push("Geen voorkeur voor feestjes");
  }

  // ── Rol voorkeur ──
  if (shift.role && !user.preferred_roles.includes(shift.role as any)) {
    score -= 60;
    reasons.push(`Geen voorkeur voor rol: ${shift.role}`);
  }

  // ── Dag voorkeur — STRIKT: niet inplannen als dag niet gewenst ──
  const shiftDay = getDayOfWeek(shift.date);
  if (shiftDay && user.preferred_days.length > 0 && !user.preferred_days.includes(shiftDay)) {
    score -= 999; // Hard uitsluiten als dag niet beschikbaar
    reasons.push(`Niet beschikbaar op ${shiftDay}`);
  }

  // ── Maandlimiet: niet meer inplannen dan preferred_frequency per maand ──
  const monthKey = getMonthKey(shift.date);
  const shiftsThisMonth = countUserShiftsInMonth(user.id, monthKey, allAssignments, allShifts);
  if (shiftsThisMonth >= user.preferred_frequency) {
    score -= 999; // Hard uitsluiten als maandlimiet bereikt
    reasons.push(`Maandlimiet bereikt (${user.preferred_frequency}x)`);
  } else if (shiftsThisMonth >= user.preferred_frequency - 1) {
    score -= 30; // Bijna vol
    reasons.push("Bijna op maandlimiet");
  }

  // ── Eerlijke verdeling: wie minder heeft getapt dit jaar krijgt prioriteit ──
  const shiftsDoneYear = countUserShiftsThisYear(user.id, allAssignments, allShifts);
  score += Math.max(0, 40 - shiftsDoneYear * 2);

  // ── Dubbele inzet op zelfde dag uitsluiten ──
  const alreadyThatDay = allAssignments.some((a) => {
    if (a.user_id !== user.id || a.status === "declined") return false;
    const s = allShifts.find((x) => x.id === a.shift_id);
    return s?.date === shift.date;
  });
  if (alreadyThatDay) {
    score = -9999;
    reasons.push("Al ingepland op deze dag");
  }

  return { score, reasons };
}

export function generateSchedule(input: ScheduleInput): AssignmentSuggestion[] {
  const { profiles, shifts, existingAssignments } = input;
  const suggestions: AssignmentSuggestion[] = [];
  const tempAssignments = [...existingAssignments];

  const sortedShifts = [...shifts].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  for (const shift of sortedShifts) {
    const alreadyAssigned = tempAssignments.filter(
      (a) => a.shift_id === shift.id && a.status !== "declined"
    ).length;
    const spotsNeeded = shift.max_tappers - alreadyAssigned;
    if (spotsNeeded <= 0) continue;

    const scored = profiles
      .filter((p) => !tempAssignments.some((a) => a.shift_id === shift.id && a.user_id === p.id))
      .map((p) => {
        const { score, reasons } = scoreUserForShift(p, shift, shifts, tempAssignments);
        return { userId: p.id, score, reasons };
      })
      .filter((x) => x.score > -900) // Alles onder -900 = hard uitgesloten
      .sort((a, b) => b.score - a.score);

    const picked = scored.slice(0, spotsNeeded);

    for (const pick of picked) {
      suggestions.push({ shiftId: shift.id, userId: pick.userId, score: pick.score, reasons: pick.reasons });
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

// iCal export
export function generateICalEvent(shift: Shift): string {
  const d = parseLocalDate(shift.date);
  const fmt = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${d.getFullYear()}${fmt(d.getMonth()+1)}${fmt(d.getDate())}`;
  const startStr = shift.start_time.replace(":", "");
  const endStr = shift.end_time.replace(":", "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OJC Walhalla//Taprooster//NL",
    "BEGIN:VEVENT",
    `UID:shift-${shift.id}@ojcwalhalla.nl`,
    `DTSTART:${dateStr}T${startStr}00`,
    `DTEND:${dateStr}T${endStr}00`,
    `SUMMARY:🍺 ${shift.title}`,
    "LOCATION:De Donckstraat 24/26\\, 5975 AC Sevenum",
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
