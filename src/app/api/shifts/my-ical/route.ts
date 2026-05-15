import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { APP_CONFIG } from "@/lib/config";
import { parseLocalDate } from "@/lib/dates";

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data: assignments } = await supabase
    .from("shift_assignments")
    .select("shift_id, status")
    .eq("user_id", user.id)
    .neq("status", "declined");

  const shiftIds = (assignments || []).map(a => a.shift_id);
  if (shiftIds.length === 0) {
    return new NextResponse("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Taprooster//NL\r\nEND:VCALENDAR", {
      headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="mijn-tapavonden.ics"' },
    });
  }

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .in("id", shiftIds)
    .gte("date", today)
    .order("date", { ascending: true });

  const fmt = (n: number) => String(n).padStart(2, "0");
  const events = (shifts || []).map(shift => {
    const d = parseLocalDate(shift.date);
    const dateStr = `${d.getFullYear()}${fmt(d.getMonth()+1)}${fmt(d.getDate())}`;
    const startStr = shift.start_time.replace(/:/g, "").slice(0, 4);
    const endStr = shift.end_time.replace(/:/g, "").slice(0, 4);
    return [
      "BEGIN:VEVENT",
      `UID:shift-${shift.id}@${APP_CONFIG.domain}`,
      `DTSTART:${dateStr}T${startStr}00`,
      `DTEND:${dateStr}T${endStr}00`,
      `SUMMARY:🍺 ${shift.title}`,
      `DESCRIPTION:Tapavond bij ${APP_CONFIG.orgName}`,
      `LOCATION:${APP_CONFIG.locationIcal}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${APP_CONFIG.orgName}//Taprooster//NL`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="mijn-tapavonden.ics"',
    },
  });
}
