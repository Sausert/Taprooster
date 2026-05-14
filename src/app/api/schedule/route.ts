import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { parseLocalDate, toLocalDateStr } from "@/lib/dates";
import { generateSchedule } from "@/lib/scheduler";

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

  // Default shift config (can be overridden by admin)
  const defaultShifts = body.defaultShifts || {
    wednesday: { enabled: true, start: "19:00", end: "23:00" },
    friday:    { enabled: true, start: "20:00", end: "00:00" },
    saturday:  { enabled: true, start: "20:00", end: "00:00" },
  };

  // Support both date range (from/to) and months array
  let rangeStart: Date;
  let rangeEnd: Date;

  if (body.dateFrom && body.dateTo) {
    // Direct date range from datepicker
    rangeStart = parseLocalDate(body.dateFrom);
    rangeEnd = parseLocalDate(body.dateTo);
  } else {
    // Legacy months array
    const months: string[] = Array.isArray(body.months) ? body.months : body.month ? [body.month] : [];
    if (months.length === 0) return NextResponse.json({ error: "Geen periode opgegeven" }, { status: 400 });
    const firstParts = months[0].split("-").map(Number);
    const lastParts = months[months.length - 1].split("-").map(Number);
    rangeStart = new Date(firstParts[0], firstParts[1] - 1, 1);
    rangeEnd = new Date(lastParts[0], lastParts[1], 0);
  }

  const rangeStartStr = toLocalDateStr(rangeStart);
  const rangeEndStr = toLocalDateStr(rangeEnd);

  // FIX: Only skip dates that already have a CONCEPT shift — NOT published shifts
  // This allows generating a new concept even if there are published shifts in the period
  const { data: existingConceptShifts } = await supabase
    .from("shifts")
    .select("date, type, role")
    .eq("status", "concept")  // ← KEY FIX: only concept, not published
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr);

  // Use date+type+role combo to avoid duplicates within concept shifts
  const existingKeys = new Set(
    (existingConceptShifts || []).map((s: any) => `${s.date}-${s.type}-${s.role}`)
  );

  const shiftsToCreate: any[] = [];

  // Woensdag: open tapavonden (geen automatische inplanning)
  if (defaultShifts.wednesday?.enabled !== false) {
    const cfg = defaultShifts.wednesday || { start:"19:00", end:"23:00" };
    for (const d of getDatesForDayInRange(3, rangeStart, rangeEnd)) {
      const dateStr = toLocalDateStr(d);
      if (!existingKeys.has(`${dateStr}-tapavond-tapper`)) {
        shiftsToCreate.push({ title:"Tapavond Woensdag", date:dateStr, start_time:cfg.start, end_time:cfg.end, type:"tapavond", role:"tapper", max_tappers:2, status:"concept", created_by:user.id });
      }
    }
  }

  // Vrijdag: 2 tappers automatisch inplannen
  if (defaultShifts.friday?.enabled !== false) {
    const cfg = defaultShifts.friday || { start:"20:00", end:"00:00" };
    for (const d of getDatesForDayInRange(5, rangeStart, rangeEnd)) {
      const dateStr = toLocalDateStr(d);
      if (!existingKeys.has(`${dateStr}-tapavond-tapper`)) {
        shiftsToCreate.push({ title:"Tapavond Vrijdag", date:dateStr, start_time:cfg.start, end_time:cfg.end, type:"tapavond", role:"tapper", max_tappers:2, status:"concept", created_by:user.id });
      }
    }
  }

  // Zaterdag: 2 tappers automatisch inplannen
  if (defaultShifts.saturday?.enabled !== false) {
    const cfg = defaultShifts.saturday || { start:"20:00", end:"00:00" };
    for (const d of getDatesForDayInRange(6, rangeStart, rangeEnd)) {
      const dateStr = toLocalDateStr(d);
      if (!existingKeys.has(`${dateStr}-tapavond-tapper`)) {
        shiftsToCreate.push({ title:"Tapavond Zaterdag", date:dateStr, start_time:cfg.start, end_time:cfg.end, type:"tapavond", role:"tapper", max_tappers:2, status:"concept", created_by:user.id });
      }
    }
  }

  // Sla nieuwe shifts op
  if (shiftsToCreate.length > 0) {
    const { error } = await supabase.from("shifts").insert(shiftsToCreate);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Haal ALLE concept shifts op voor de periode (incl. net aangemaakte)
  const { data: allConceptShifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("status", "concept")
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr);

  // Woensdag NIET automatisch inplannen — tappers schrijven zelf in
  const shiftsForAutoAssign = (allConceptShifts || []).filter((s: any) => {
    const d = parseLocalDate(s.date);
    return !(s.type === "tapavond" && d.getDay() === 3);
  });

  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: existingAssignments } = await supabase.from("shift_assignments").select("*");

  const suggestions = generateSchedule({
    profiles: profiles || [],
    shifts: shiftsForAutoAssign,
    existingAssignments: existingAssignments || [],
  });

  if (suggestions.length > 0) {
    const { error: upsertError } = await supabase.from("shift_assignments").upsert(
      suggestions.map(s => ({ shift_id: s.shiftId, user_id: s.userId, status: "assigned" })),
      { onConflict: "shift_id,user_id" }
    );
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Geef conceptrooster terug met assignments
  const { data: updatedShifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
    .eq("status", "concept")
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr)
    .order("date", { ascending: true });

  return NextResponse.json({
    data: {
      suggestions: suggestions.length,
      shiftsCreated: shiftsToCreate.length,
      shifts: updatedShifts || [],
      rangeStart: rangeStartStr,
      rangeEnd: rangeEndStr,
    }
  });
}
