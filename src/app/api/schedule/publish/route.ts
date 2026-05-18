import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase-server";
import { sendRosterPublishedEmail } from "@/lib/email";
import { parseLocalDate } from "@/lib/dates";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getMonthName(m: string): string {
  const months = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  return months[parseInt(m, 10) - 1] || m;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }
  const message = body.message as string | undefined;
  const rawShiftIds = Array.isArray(body.shiftIds) ? (body.shiftIds as unknown[]) : null;
  if (rawShiftIds && rawShiftIds.length > 500) {
    return NextResponse.json({ error: "Te veel shifts opgegeven (max 500)" }, { status: 400 });
  }
  if (rawShiftIds && !rawShiftIds.every(id => typeof id === "string" && UUID_RE.test(id))) {
    return NextResponse.json({ error: "Ongeldige shift-ID in lijst" }, { status: 400 });
  }
  const shiftIds = rawShiftIds as string[] | null;

  // Admin client bypasses RLS — needed for notification inserts
  const adminClient = createAdminClient();
  const { data: allProfiles } = await adminClient.from("profiles").select("id, email, full_name");

  // ── Feestje-modus: publiceer alleen specifieke shifts ──
  if (shiftIds && shiftIds.length > 0) {
    const { error: publishError } = await supabase.from("shifts")
      .update({ status: "published" })
      .in("id", shiftIds);
    if (publishError) return NextResponse.json({ error: "Publiceren mislukt" }, { status: 500 });

    // Haal shift details op voor de notificatietekst
    const { data: feestjeShifts } = await supabase.from("shifts").select("title, date").in("id", shiftIds).limit(1);
    const firstShift = feestjeShifts?.[0];
    const feestjeName = firstShift?.title?.replace(/ \(.*\)$/, "") || "feestje";
    const feestjeDate = firstShift
      ? parseLocalDate(firstShift.date).toLocaleDateString("nl-NL", { weekday:"long", day:"numeric", month:"long" })
      : "";
    const notifMessage = message || `${feestjeName}${feestjeDate ? ` op ${feestjeDate}` : ""}. Meld je aan via het rooster!`;

    if (allProfiles && allProfiles.length > 0) {
      await adminClient.from("notifications").insert(
        allProfiles.map(p => ({
          user_id: p.id,
          type: "roster_published",
          title: "🎉 Nieuw feestje gepubliceerd!",
          message: notifMessage,
          read: false,
        }))
      );
      await Promise.allSettled(allProfiles.map(p =>
        sendRosterPublishedEmail(p.email, p.full_name, notifMessage)
      ));
    }

    return NextResponse.json({ data: { published: true, notified: allProfiles?.length || 0 } });
  }

  // ── Reguliere rooster-modus: publiceer op datum range ──
  const dateFrom = body.dateFrom as string | undefined;
  const dateTo = body.dateTo as string | undefined;

  let rangeStart: string;
  let rangeEnd: string;

  if (dateFrom && dateTo) {
    if (!DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
      return NextResponse.json({ error: "Ongeldig datumformaat (verwacht YYYY-MM-DD)" }, { status: 400 });
    }
    rangeStart = dateFrom;
    rangeEnd = dateTo;
  } else {
    const months: string[] = Array.isArray(body.months) ? body.months : body.month ? [body.month] : [];
    if (months.length === 0) return NextResponse.json({ error: "Geen periode opgegeven" }, { status: 400 });
    const allDates = months.map((m: string) => {
      const [year, mo] = m.split("-");
      const lastDay = new Date(Number(year), Number(mo), 0).getDate();
      return { start: `${year}-${mo}-01`, end: `${year}-${mo}-${String(lastDay).padStart(2, "0")}` };
    });
    rangeStart = allDates[0].start;
    rangeEnd = allDates[allDates.length - 1].end;
  }

  const { error: publishError } = await supabase.from("shifts")
    .update({ status: "published" })
    .eq("status", "concept")
    .gte("date", rangeStart).lte("date", rangeEnd);

  if (publishError) return NextResponse.json({ error: "Publiceren mislukt" }, { status: 500 });

  // Maak periode label van rangeStart/rangeEnd
  const startParts = rangeStart.split("-");
  const endParts = rangeEnd.split("-");
  const periodLabel = (startParts[0] === endParts[0] && startParts[1] === endParts[1])
    ? `${getMonthName(startParts[1])} ${startParts[0]}`
    : `${getMonthName(startParts[1])} ${startParts[0]} t/m ${getMonthName(endParts[1])} ${endParts[0]}`;

  const notifMessage = message || `Het rooster voor ${periodLabel} staat live. Bekijk jouw ingeplande diensten.`;

  if (allProfiles && allProfiles.length > 0) {
    const { error: notifError } = await adminClient.from("notifications").insert(
      allProfiles.map(p => ({
        user_id: p.id,
        type: "roster_published",
        title: "📅 Rooster gepubliceerd!",
        message: notifMessage,
        read: false,
      }))
    );
    if (notifError) { /* notif insert failure is non-fatal */ }
  }

  const { data: publishedShifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, profile:profiles(email, full_name))")
    .eq("status", "published")
    .gte("date", rangeStart).lte("date", rangeEnd);

  if (publishedShifts && publishedShifts.length > 0) {
    const shiftNotifs: { user_id: string; type: string; title: string; message: string; shift_id: string; read: boolean }[] = [];
    for (const shift of publishedShifts) {
      for (const assignment of (shift.assignments || [])) {
        shiftNotifs.push({
          user_id: assignment.user_id,
          type: "shift_assigned",
          title: "🍺 Jij staat ingepland!",
          message: `${shift.title} op ${parseLocalDate(shift.date).toLocaleDateString("nl-NL", { weekday:"long", day:"numeric", month:"long" })} · ${shift.start_time}–${shift.end_time}`,
          shift_id: shift.id,
          read: false,
        });
      }
    }
    if (shiftNotifs.length > 0) {
      await adminClient.from("notifications").insert(shiftNotifs);
    }
  }

  if (allProfiles) {
    await Promise.allSettled(allProfiles.map(p =>
      sendRosterPublishedEmail(p.email, p.full_name, message)
    ));
  }

  return NextResponse.json({ data: { published: true, notified: allProfiles?.length || 0 } });
}
