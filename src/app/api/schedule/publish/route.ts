import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendRosterPublishedEmail } from "@/lib/email";

function getMonthName(m: string): string {
  const months = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  return months[parseInt(m, 10) - 1] || m;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (adminProfile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const months: string[] = Array.isArray(body.months) ? body.months : body.month ? [body.month] : [];
  const { message } = body;
  if (months.length === 0) return NextResponse.json({ error: "Geen periode opgegeven" }, { status: 400 });

  const allDates = months.map(m => {
    const [year, mo] = m.split("-");
    return { start: `${year}-${mo}-01`, end: `${year}-${mo}-31` };
  });
  const rangeStart = allDates[0].start;
  const rangeEnd = allDates[allDates.length - 1].end;

  // Publiceer alle concept shifts in de periode
  const { error: publishError } = await supabase.from("shifts")
    .update({ status: "published" })
    .eq("status", "concept")
    .gte("date", rangeStart).lte("date", rangeEnd);

  if (publishError) return NextResponse.json({ error: publishError.message }, { status: 500 });

  // Haal alle tappers op
  const { data: allProfiles } = await supabase.from("profiles").select("id, email, full_name");

  // Maak periode label
  const periodLabel = months.length === 1
    ? `${getMonthName(months[0].split("-")[1])} ${months[0].split("-")[0]}`
    : `${getMonthName(months[0].split("-")[1])} t/m ${getMonthName(months[months.length-1].split("-")[1])} ${months[months.length-1].split("-")[0]}`;

  const notifMessage = message || `Het rooster voor ${periodLabel} staat live. Bekijk jouw ingeplande diensten.`;

  // Maak in-app notificaties voor ALLE tappers
  if (allProfiles && allProfiles.length > 0) {
    const { error: notifError } = await supabase.from("notifications").insert(
      allProfiles.map(p => ({
        user_id: p.id,
        type: "roster_published",
        title: "📅 Rooster gepubliceerd!",
        message: notifMessage,
        read: false,
      }))
    );
    if (notifError) console.error("Notif insert error:", notifError.message);
  }

  // Haal gepubliceerde shifts op voor de periode om per-persoon notificaties te sturen
  const { data: publishedShifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, profile:profiles(email, full_name))")
    .eq("status", "published")
    .gte("date", rangeStart).lte("date", rangeEnd);

  // Stuur ook notificaties per dienst aan de ingeplande tappers
  if (publishedShifts && publishedShifts.length > 0) {
    const shiftNotifs: any[] = [];
    for (const shift of publishedShifts) {
      for (const assignment of (shift.assignments || [])) {
        shiftNotifs.push({
          user_id: assignment.user_id,
          type: "shift_assigned",
          title: "🍺 Jij staat ingepland!",
          message: `${shift.title} op ${new Date(shift.date).toLocaleDateString("nl-NL", { weekday:"long", day:"numeric", month:"long" })} · ${shift.start_time}–${shift.end_time}`,
          shift_id: shift.id,
          read: false,
        });
      }
    }
    if (shiftNotifs.length > 0) {
      await supabase.from("notifications").insert(shiftNotifs);
    }
  }

  // Verstuur e-mails (fire-and-forget)
  if (allProfiles) {
    Promise.allSettled(allProfiles.map(p =>
      sendRosterPublishedEmail(p.email, p.full_name, message)
    ));
  }

  return NextResponse.json({ data: { published: true, notified: allProfiles?.length || 0 } });
}
