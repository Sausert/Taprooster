import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateSchedule } from "@/lib/scheduler";

// Timezone-safe: gebruik altijd lokale datumonderdelen, nooit toISOString()
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse date string zonder timezone offset
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

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
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const months: string[] = Array.isArray(body.months) ? body.months : body.month ? [body.month] : [];
  if (months.length === 0) return NextResponse.json({ error: "Geen periode opgegeven" }, { status: 400 });

  // Bepaal datumrange — gebruik parseLocalDate voor consistentie
  const firstParts = months[0].split("-").map(Number);
  const lastParts = months[months.length - 1].split("-").map(Number);
  const rangeStart = new Date(firstParts[0], firstParts[1] - 1, 1);
  const rangeEnd = new Date(lastParts[0], lastParts[1], 0); // laatste dag van laatste maand
  const rangeStartStr = toLocalDateStr(rangeStart);
  const rangeEndStr = toLocalDateStr(rangeEnd);

  // Bestaande shifts ophalen om duplicaten te voorkomen
  const { data: existingShifts } = await supabase
    .from("shifts").select("date, type, role")
    .gte("date", rangeStartStr).lte("date", rangeEndStr);

  const existingDates = new Set((existingShifts || []).map((s: any) => s.date));

  const shiftsToCreate: any[] = [];

  // Woensdag: open tapavonden (geen automatische inplanning)
  for (const d of getDatesForDayInRange(3, rangeStart, rangeEnd)) {
    const dateStr = toLocalDateStr(d);
    if (!existingDates.has(dateStr)) {
      shiftsToCreate.push({ title:"Tapavond Woensdag", date:dateStr, start_time:"19:00", end_time:"23:00", type:"tapavond", role:"tapper", max_tappers:2, status:"concept", created_by:user.id });
    }
  }

  // Vrijdag: 2 tappers automatisch inplannen
  for (const d of getDatesForDayInRange(5, rangeStart, rangeEnd)) {
    const dateStr = toLocalDateStr(d);
    if (!existingDates.has(dateStr)) {
      shiftsToCreate.push({ title:"Tapavond Vrijdag", date:dateStr, start_time:"20:00", end_time:"00:00", type:"tapavond", role:"tapper", max_tappers:2, status:"concept", created_by:user.id });
    }
  }

  // Zaterdag: 2 tappers automatisch inplannen
  for (const d of getDatesForDayInRange(6, rangeStart, rangeEnd)) {
    const dateStr = toLocalDateStr(d);
    if (!existingDates.has(dateStr)) {
      shiftsToCreate.push({ title:"Tapavond Zaterdag", date:dateStr, start_time:"20:00", end_time:"00:00", type:"tapavond", role:"tapper", max_tappers:2, status:"concept", created_by:user.id });
    }
  }

  // Sla nieuwe shifts op
  if (shiftsToCreate.length > 0) {
    const { error } = await supabase.from("shifts").insert(shiftsToCreate);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Alle concept shifts voor de periode ophalen
  const { data: allConceptShifts } = await supabase
    .from("shifts").select("*")
    .eq("status", "concept")
    .gte("date", rangeStartStr).lte("date", rangeEndStr);

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
    await supabase.from("shift_assignments").upsert(
      suggestions.map(s => ({ shift_id: s.shiftId, user_id: s.userId, status: "assigned" })),
      { onConflict: "shift_id,user_id" }
    );
  }

  const { data: updatedShifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
    .eq("status", "concept")
    .gte("date", rangeStartStr).lte("date", rangeEndStr)
    .order("date", { ascending: true });

  return NextResponse.json({ data: { suggestions: suggestions.length, shiftsCreated: shiftsToCreate.length, shifts: updatedShifts || [] } });
}
