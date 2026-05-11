import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function parseLocalDate(dateStr: string) {
  const [y,m,d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("id", id).single();

  if (!shift) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const d = parseLocalDate(shift.date);
  const fmt = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${d.getFullYear()}${fmt(d.getMonth()+1)}${fmt(d.getDate())}`;
  const startStr = shift.start_time.replace(":", "");
  const endStr = shift.end_time.replace(":", "");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OJC Walhalla//Taprooster//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:shift-${shift.id}@ojcwalhalla.nl`,
    `DTSTART:${dateStr}T${startStr}00`,
    `DTEND:${dateStr}T${endStr}00`,
    `SUMMARY:🍺 ${shift.title}`,
    `DESCRIPTION:Tapavond bij OJC Walhalla`,
    "LOCATION:De Donckstraat 24/26\\, 5975 AC Sevenum",
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="walhalla-${shift.date}.ics"`,
    },
  });
}
