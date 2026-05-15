import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";
import { sendOpenShiftEmail } from "@/lib/email";
import { parseLocalDate } from "@/lib/dates";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: shiftId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }
  const action = body.action as string | undefined;

  // Admin can assign on behalf of another user
  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = adminProfile?.role === "admin";
  // If admin passes targetUserId, use that; otherwise use logged-in user
  const targetUserId = (isAdmin && body.targetUserId) ? body.targetUserId as string : user.id;

  if (action === "claim") {
    // Check capacity
    const { data: shift } = await supabase.from("shift_occupancy").select("*").eq("id", shiftId).single();
    if (!shift) return NextResponse.json({ error: "Shift niet gevonden" }, { status: 404 });
    if ((shift.open_spots || 0) <= 0) return NextResponse.json({ error: "Geen open plekken meer" }, { status: 409 });

    // Check if already assigned
    const { data: existing } = await supabase.from("shift_assignments")
      .select("id, status").eq("shift_id", shiftId).eq("user_id", targetUserId).single();

    if (existing) {
      if (existing.status === "declined") {
        // Re-activate
        const { data, error } = await supabase.from("shift_assignments")
          .update({ status: "assigned", declined_at: null }).eq("id", existing.id).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
      }
      return NextResponse.json({ error: "Al ingeschreven" }, { status: 409 });
    }

    const { data, error } = await supabase.from("shift_assignments")
      .insert({ shift_id: shiftId, user_id: targetUserId, status: "assigned" }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (action === "confirm") {
    const { data, error } = await supabase.from("shift_assignments")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("shift_id", shiftId).eq("user_id", targetUserId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (action === "decline") {
    const { error: declineError } = await supabase.from("shift_assignments")
      .update({ status: "declined", declined_at: new Date().toISOString() })
      .eq("shift_id", shiftId).eq("user_id", targetUserId);
    if (declineError) return NextResponse.json({ error: declineError.message }, { status: 500 });

    const { data: shift } = await supabase.from("shifts")
      .select("*, assignments:shift_assignments(user_id, status)").eq("id", shiftId).single();

    if (shift) {
      const { data: allProfiles } = await supabase.from("profiles")
        .select("id, email, full_name").neq("id", targetUserId);
      const shiftDate = parseLocalDate(shift.date).toLocaleDateString("nl-NL", { weekday:"long", day:"numeric", month:"long" });
      const shiftTime = `${shift.start_time}–${shift.end_time}`;
      if (allProfiles) {
        const adminClient = createAdminClient();
        await adminClient.from("notifications").insert(
          allProfiles.map(p => ({ user_id:p.id, type:"open_shift", title:"🔓 Open dienst!", message:`Er is een open plek voor ${shift.title} op ${shiftDate}.`, shift_id:shiftId, read:false }))
        );
        await Promise.allSettled(allProfiles.map(p => sendOpenShiftEmail(p.email, p.full_name, shift.title, shiftDate, shiftTime, shiftId)));
      }
    }
    return NextResponse.json({ data: { declined: true } });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
