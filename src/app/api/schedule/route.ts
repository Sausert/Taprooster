// app/api/schedule/route.ts — Rooster genereren
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateSchedule } from "@/lib/scheduler";

// Geeft alle datums in een range terug voor een specifieke dag van de week
// dag: 3=woensdag, 5=vrijdag, 6=zaterdag
function getDatesForDayInRange(dayOfWeek: number, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  // Ga naar de eerste gewenste dag
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDayLabel(dayOfWeek: number): string {
  return dayOfWeek === 3 ? "Woensdag" : dayOfWeek === 5 ? "Vrijdag" : "Zaterdag";
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

  // Bepaal datumrange
  const firstMonth = months[0].split("-");
  const lastMonth = months[months.length - 1].split("-");
  const rangeStart = new Date(Number(firstMonth[0]), Number(firstMonth[1]) - 1, 1);
  const rangeEnd = new Date(Number(lastMonth[0]), Number(lastMonth[1]) - 1 + 1, 0); // laatste dag van laatste maand
  const rangeStartStr = toDateStr(rangeStart);
  const rangeEndStr = toDateStr(rangeEnd);

  // ── Stap 1: Genereer automatisch tapavond-shifts voor wo/vr/za ──
  // Haal bestaande shifts op zodat we geen duplicaten aanmaken
  const { data: existingShifts } = await supabase
    .from("shifts")
    .select("date, type, role")
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr);

  const existingDates = new Set((existingShifts || []).map((s: any) => s.date));

  const shiftsToCreate: any[] = [];

  // Woensdag: open diensten (niemand ingepland, tappers schrijven zelf in)
  const woensdagen = getDatesForDayInRange(3, rangeStart, rangeEnd);
  for (const d of woensdagen) {
    const dateStr = toDateStr(d);
    if (!existingDates.has(dateStr)) {
      shiftsToCreate.push({
        title: "Tapavond Woensdag",
        date: dateStr,
        start_time: "19:00",
        end_time: "23:00",
        type: "tapavond",
        role: "tapper",
        max_tappers: 2,
        status: "concept",
        created_by: user.id,
        // Woensdag: geen automatische inplanning — tappers schrijven zelf in
        auto_assign: false,
      });
    }
  }

  // Vrijdag: 2 tappers automatisch inplannen
  const vrijdagen = getDatesForDayInRange(5, rangeStart, rangeEnd);
  for (const d of vrijdagen) {
    const dateStr = toDateStr(d);
    if (!existingDates.has(dateStr)) {
      shiftsToCreate.push({
        title: "Tapavond Vrijdag",
        date: dateStr,
        start_time: "20:00",
        end_time: "00:00",
        type: "tapavond",
        role: "tapper",
        max_tappers: 2,
        status: "concept",
        created_by: user.id,
        auto_assign: true,
      });
    }
  }

  // Zaterdag: 2 tappers automatisch inplannen
  const zaterdagen = getDatesForDayInRange(6, rangeStart, rangeEnd);
  for (const d of zaterdagen) {
    const dateStr = toDateStr(d);
    if (!existingDates.has(dateStr)) {
      shiftsToCreate.push({
        title: "Tapavond Zaterdag",
        date: dateStr,
        start_time: "20:00",
        end_time: "00:00",
        type: "tapavond",
        role: "tapper",
        max_tappers: 2,
        status: "concept",
        created_by: user.id,
        auto_assign: true,
      });
    }
  }

  // Sla nieuwe shifts op (zonder auto_assign veld — dat is alleen voor logica hier)
  let createdShiftIds: string[] = [];
  if (shiftsToCreate.length > 0) {
    const insertsClean = shiftsToCreate.map(({ auto_assign, ...rest }) => rest);
    const { data: newShifts, error: insertError } = await supabase
      .from("shifts")
      .insert(insertsClean)
      .select("id, date, type, role");

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    createdShiftIds = (newShifts || []).map((s: any) => s.id);
  }

  // ── Stap 2: Haal alle concept shifts op voor de periode ──
  const { data: allConceptShifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("*")
    .eq("status", "concept")
    .gte("date", rangeStartStr)
    .lte("date", rangeEndStr);

  if (shiftsError) return NextResponse.json({ error: shiftsError.message }, { status: 500 });

  // ── Stap 3: Bepaal welke shifts automatisch ingevuld moeten worden ──
  // Vrijdag en zaterdag tapavonden => auto assign
  // Woensdag tapavonden => NIET auto assign
  // Feestjes => auto assign (op basis van wants_parties voorkeur)
  const shiftsForAutoAssign = (allConceptShifts || []).filter((s: any) => {
    const dow = new Date(s.date).getDay();
    if (s.type === "tapavond" && dow === 3) return false; // Woensdag: open, niet automatisch
    return true;
  });

  // ── Stap 4: Haal profielen en bestaande assignments op ──
  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: existingAssignments } = await supabase.from("shift_assignments").select("*");

  // ── Stap 5: Genereer toewijzingen ──
  const suggestions = generateSchedule({
    profiles: profiles || [],
    shifts: shiftsForAutoAssign,
    existingAssignments: existingAssignments || [],
  });

  if (suggestions.length > 0) {
    await supabase.from("shift_assignments").upsert(
      suggestions.map((s) => ({ shift_id: s.shiftId, user_id: s.userId, status: "assigned" })),
      { onConflict: "shift_id,user_id" }
    );
  }

  // ── Stap 6: Geef bijgewerkt conceptrooster terug ──
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
    },
  });
}
