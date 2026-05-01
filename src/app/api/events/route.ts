// app/api/events/route.ts — Feestjes/evenementen aanmaken met diensten
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

const ShiftSchema = z.object({
  role: z.enum(["tapper", "bonnenkassa"]),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  max_tappers: z.number().min(1).max(20),
});

const EventSchema = z.object({
  title: z.string().min(1, "Naam is verplicht"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum"),
  shifts: z.array(ShiftSchema).min(1, "Minimaal 1 dienst vereist"),
});

// GET — alle evenementen ophalen
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date().toISOString().split("T")[0];
  const to = searchParams.get("to") || `${new Date().getFullYear()}-12-31`;

  const { data, error } = await supabase
    .from("events")
    .select("*, shifts(*)")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST — nieuw evenement aanmaken
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, date, shifts } = parsed.data;

  // Maak event aan
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({ title, date, type: "feestje", created_by: user.id })
    .select()
    .single();

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

  // Maak alle diensten aan voor dit event
  const shiftInserts = shifts.map((s) => ({
    event_id: event.id,
    title: `${title} — ${s.role === "bonnenkassa" ? "Bonnenkassa" : "Tapper"}`,
    date,
    start_time: s.start_time,
    end_time: s.end_time,
    type: "feestje" as const,
    role: s.role,
    max_tappers: s.max_tappers,
    status: "concept" as const,
    created_by: user.id,
  }));

  const { data: createdShifts, error: shiftsError } = await supabase
    .from("shifts")
    .insert(shiftInserts)
    .select();

  if (shiftsError) return NextResponse.json({ error: shiftsError.message }, { status: 500 });

  return NextResponse.json({ data: { event, shifts: createdShifts } }, { status: 201 });
}
