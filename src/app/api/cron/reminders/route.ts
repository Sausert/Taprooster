// app/api/cron/reminders/route.ts
// Aanroepen dagelijks via Vercel Cron (zie vercel.json)
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { sendShiftReminderEmail, sendUnconfirmedReminderEmail } from "@/lib/email";
import { parseLocalDate, toLocalDateStr, addDays } from "@/lib/dates";
import { sendPushToUser } from "@/lib/push";

export async function GET(req: NextRequest) {
  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const in14 = toLocalDateStr(addDays(today, 14));
  const in7  = toLocalDateStr(addDays(today, 7));
  const in30 = toLocalDateStr(addDays(today, 30));
  let sent = 0;

  async function alreadySent(userId: string, type: string, shiftId: string): Promise<boolean> {
    const { count } = await supabase.from("notifications")
      .select("*", { count:"exact", head:true })
      .eq("user_id", userId).eq("type", type).eq("shift_id", shiftId)
      .gte("created_at", `${todayStr}T00:00:00`);
    return (count || 0) > 0;
  }

  async function processShifts(date: string, type: "reminder_2weeks"|"reminder_1week", weeks: 1|2) {
    const { data: shifts } = await supabase
      .from("shifts")
      .select("*, assignments:shift_assignments(user_id, status, profile:profiles(email, full_name))")
      .eq("status", "published").eq("date", date);

    for (const shift of shifts || []) {
      const dateLabel = parseLocalDate(shift.date).toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"});
      const timeLabel = `${shift.start_time}–${shift.end_time}`;

      for (const a of (shift.assignments || [])) {
        if (a.status === "declined") continue;  // alleen ingeplande + bevestigde tappers
        if (!a.profile?.email) continue;
        if (await alreadySent(a.user_id, type, shift.id)) continue;

        await supabase.from("notifications").insert({
          user_id: a.user_id, type,
          title: `⏰ Reminder: dienst over ${weeks === 2 ? "2 weken" : "1 week"}`,
          message: `${shift.title} op ${dateLabel} · ${timeLabel}`,
          shift_id: shift.id, read: false,
        });

        await Promise.allSettled([
          sendShiftReminderEmail(a.profile.email, a.profile.full_name, shift.title, dateLabel, timeLabel, weeks, shift.id),
          sendPushToUser(a.user_id, {
            title: `⏰ Dienst over ${weeks === 2 ? "2 weken" : "1 week"}`,
            body: `${shift.title} op ${dateLabel} · ${timeLabel}`,
            url: "/dashboard",
            tag: type,
          }),
        ]);
        sent++;
      }
    }
  }

  // 1. Reminder 2 weken
  await processShifts(in14, "reminder_2weeks", 2);

  // 2. Reminder 1 week
  await processShifts(in7, "reminder_1week", 1);

  // 3. Onbevestigde diensten binnen 30 dagen
  const { data: upcoming } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(email, full_name))")
    .eq("status", "published")
    .gte("date", todayStr).lte("date", in30);

  for (const shift of upcoming || []) {
    const dateLabel = parseLocalDate(shift.date).toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"});
    const timeLabel = `${shift.start_time}–${shift.end_time}`;
    for (const a of (shift.assignments || [])) {
      if (a.status !== "assigned") continue; // alleen onbevestigd
      if (await alreadySent(a.user_id, "unconfirmed_reminder", shift.id)) continue;
      await supabase.from("notifications").insert({
        user_id: a.user_id, type:"unconfirmed_reminder",
        title: "❗ Bevestig jouw dienst",
        message: `Je hebt nog niet bevestigd voor ${shift.title} op ${dateLabel}.`,
        shift_id: shift.id, read: false,
      });
      await Promise.allSettled([
        a.profile?.email
          ? sendUnconfirmedReminderEmail(a.profile.email, a.profile.full_name, shift.title, dateLabel, timeLabel, shift.id)
          : Promise.resolve(),
        sendPushToUser(a.user_id, {
          title: "❗ Bevestig jouw dienst",
          body: `Jij staat nog niet bevestigd voor ${shift.title} op ${dateLabel}.`,
          url: "/dashboard",
          tag: "unconfirmed_reminder",
        }),
      ]);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent, date: todayStr });
}
