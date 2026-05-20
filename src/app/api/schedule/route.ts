import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { parseLocalDate, toLocalDateStr } from "@/lib/dates";
import { generateSchedule } from "@/lib/scheduler";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getDatesForDayInRange(dayOfWeek: number, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (current.getDay() !== dayOfWeek) current.setDate(current.getDate() + 1);
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  while (current.getTime() <= endTime) {
    dates.push(new Date(current.getFullYear(), current.getMonth(), current.getDate()));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }

  const DAY_MAP: Record<string, { jsDay: number; title: string }> = {
    monday:    { jsDay: 1, title: "Maandag" },
    tuesday:   { jsDay: 2, title: "Dinsdag" },
    wednesday: { jsDay: 3, title: "Woensdag" },
    thursday:  { jsDay: 4, title: "Donderdag" },
    friday:    { jsDay: 5, title: "Vrijdag" },
    saturday:  { jsDay: 6, title: "Zaterdag" },
    sunday:    { jsDay: 0, title: "Zondag" },
  };

  const defaultShifts = body.defaultShifts || {
    monday:    { enabled: false, start: "19:00", end: "23:00", max_tappers: 2, mode: "auto" },
    tuesday:   { enabled: false, start: "19:00", end: "23:00", max_tappers: 2, mode: "auto" },
    wednesday: { enabled: true,  start: "19:00", end: "23:00", max_tappers: 2, mode: "open" },
    thursday:  { enabled: false, start: "19:00", end: "23:00", max_tappers: 2, mode: "auto" },
    friday:    { enabled: true,  start: "20:00", end: "00:00", max_tappers: 2, mode: "auto" },
    saturday:  { enabled: true,  start: "20:00", end: "00:00", max_tappers: 2, mode: "auto" },
    sunday:    { enabled: false, start: "20:00", end: "00:00", max_tappers: 2, mode: "auto" },
  };

  let rangeStart: Date;
  let rangeEnd: Date;

  if (body.dateFrom && body.dateTo) {
    if (!DATE_RE.test(body.dateFrom) || !DATE_RE.test(body.dateTo)) {
      return NextResponse.json({ error: "Ongeldig datumformaat (verwacht YYYY-MM-DD)" }, { status: 400 });
    }
    rangeStart = parseLocalDate(body.dateFrom);
    rangeEnd = parseLocalDate(body.dateTo);
  } else {
    const months: string[] = Array.isArray(body.months) ? body.months : body.month ? [body.month] : [];
    if (months.length === 0) return NextResponse.json({ error: "Geen periode opgegeven" }, { status: 400 });
    const firstParts = months[0].split("-").map(Number);
    const lastParts = months[months.length - 1].split("-").map(Number);
    rangeStart = new Date(firstParts[0], firstParts[1] - 1, 1);
    rangeEnd = new Date(lastParts[0], lastParts[1], 0);
  }

  const rangeStartStr = toLocalDateStr(rangeStart);
  const rangeEndStr = toLocalDateStr(rangeEnd);

  const { data: existingTapavonden } = await supabase
    .from("shifts")
    .select("date")
    .eq("type", "tapavond")
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr);

  const existingTapavondDates = new Set(
    (existingTapavonden || []).map((s: any) => s.date)
  );

  const shiftsToCreate: any[] = [];

  // Track which dates should auto-assign (mode === "auto")
  const autoAssignDates = new Set<string>();

  for (const [dayName, { jsDay, title }] of Object.entries(DAY_MAP)) {
    const cfg = defaultShifts[dayName];
    if (!cfg || cfg.enabled === false) continue;
    const maxTappers = Number(cfg.max_tappers) || 2;
    const mode = cfg.mode ?? "auto";
    for (const d of getDatesForDayInRange(jsDay, rangeStart, rangeEnd)) {
      const dateStr = toLocalDateStr(d);
      if (!existingTapavondDates.has(dateStr)) {
        shiftsToCreate.push({ title: `Tapavond ${title}`, date: dateStr, start_time: cfg.start, end_time: cfg.end, type: "tapavond", role: "tapper", max_tappers: maxTappers, status: "concept", created_by: user.id });
        if (mode === "auto") autoAssignDates.add(dateStr);
      }
    }
  }

  if (shiftsToCreate.length > 0) {
    const { error } = await supabase.from("shifts").insert(shiftsToCreate);
    if (error) return NextResponse.json({ error: "Shifts aanmaken mislukt" }, { status: 500 });
  }

  const { data: allConceptShifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("status", "concept")
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr);

  // Auto-assign only for shifts where the day config has mode === "auto"
  const shiftsForAutoAssign = (allConceptShifts || []).filter((s: any) =>
    s.type === "tapavond" && autoAssignDates.has(s.date)
  );

  if (shiftsForAutoAssign.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: existingAssignments } = await supabase.from("shift_assignments").select("*");
    const yearStart = `${rangeStart.getFullYear()}-01-01`;
    const yearEnd = `${rangeStart.getFullYear()}-12-31`;
    const { data: publishedShiftsForContext } = await supabase
      .from("shifts")
      .select("*")
      .eq("status", "published")
      .gte("date", yearStart)
      .lte("date", yearEnd);

    const suggestions = generateSchedule({
      profiles: profiles || [],
      shifts: shiftsForAutoAssign,
      existingAssignments: existingAssignments || [],
      contextShifts: publishedShiftsForContext || [],
    });

    if (suggestions.length > 0) {
      const { error: upsertError } = await supabase.from("shift_assignments").upsert(
        suggestions.map(s => ({ shift_id: s.shiftId, user_id: s.userId, status: "assigned" })),
        { onConflict: "shift_id,user_id" }
      );
      if (upsertError) return NextResponse.json({ error: "Inplannen mislukt" }, { status: 500 });
    }
  }

  const { data: updatedShifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
    .eq("status", "concept")
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr)
    .order("date", { ascending: true });

  return NextResponse.json({
    data: {
      shiftsCreated: shiftsToCreate.length,
      shifts: updatedShifts || [],
      rangeStart: rangeStartStr,
      rangeEnd: rangeEndStr,
    }
  });
}
