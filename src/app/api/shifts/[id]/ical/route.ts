import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { APP_CONFIG } from "@/lib/config";
import { parseLocalDate } from "@/lib/dates";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("id", id).single();

  if (!shift) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

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

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${APP_CONFIG.orgName}//Taprooster//NL`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:shift-${shift.id}@${APP_CONFIG.domain}`,
    `DTSTART:${dateStr}T${startStr}00`,
    `DTEND:${endDateStr}T${endStr}00`,
    `SUMMARY:🍺 ${shift.title}`,
    `DESCRIPTION:Tapavond bij ${APP_CONFIG.orgName}`,
    `LOCATION:${APP_CONFIG.locationIcal}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="walhalla-${shift.date}.ics"`,
    },
  });
}
