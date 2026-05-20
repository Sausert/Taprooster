export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  const today = new Date().toISOString().split("T")[0];
  const thisYear = new Date().getFullYear();

  // All published shifts this year
  const { data: allYearShifts } = await supabase
    .from("shifts").select("id, date")
    .eq("status", "published")
    .gte("date", `${thisYear}-01-01`)
    .lte("date", `${thisYear}-12-31`);

  const pastShiftIds = (allYearShifts || []).filter((s: any) => s.date < today).map((s: any) => s.id);
  const futureShiftIds = (allYearShifts || []).filter((s: any) => s.date >= today).map((s: any) => s.id);

  // Past taps (already happened)
  let tapsThisYear = 0;
  if (pastShiftIds.length > 0) {
    const { count } = await supabase
      .from("shift_assignments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "declined")
      .in("shift_id", pastShiftIds);
    tapsThisYear = count || 0;
  }

  // Future planned shifts (all upcoming, not just 30 days)
  let myUpcoming: any[] = [];
  if (futureShiftIds.length > 0) {
    const { data: myFutureAssignments } = await supabase
      .from("shift_assignments")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "declined")
      .in("shift_id", futureShiftIds);

    if ((myFutureAssignments || []).length > 0) {
      // Use adminClient so RLS doesn't hide other tappers' assignments
      const adminClient = createAdminClient();
      const { data: futureShiftDetails } = await adminClient
        .from("shifts").select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
        .in("id", (myFutureAssignments || []).map((a: any) => a.shift_id))
        .order("date", { ascending: true });

      myUpcoming = (myFutureAssignments || []).map((a: any) => ({
        ...a,
        shift: (futureShiftDetails || []).find((s: any) => s.id === a.shift_id) || null,
      })).filter((a: any) => a.shift !== null)
        .sort((a: any, b: any) => a.shift.date.localeCompare(b.shift.date));
    }
  }

  const myShiftIds = myUpcoming.map((a: any) => a.shift_id);
  const incomingPlanned = myUpcoming.length; // count of future planned shifts

  // Open diensten — use adminClient so RLS doesn't hide other tappers' assignments
  const adminClientForOpen = createAdminClient();
  const { data: openShiftsRaw } = await adminClientForOpen
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
    .eq("status", "published")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(100);

  const claimableShifts = (openShiftsRaw || [])
    .map((s: any) => {
      const filled = (s.assignments || []).filter((a: any) => a.status !== "declined").length;
      return { ...s, open_spots: Math.max(0, s.max_tappers - filled) };
    })
    .filter((s: any) => s.open_spots > 0 && !myShiftIds.includes(s.id));

  const { data: leaderboard } = await supabase
    .from("leaderboard").select("*").order("rank", { ascending: true });
  const myRank = leaderboard?.find((l: any) => l.id === user.id)?.rank || 0;

  const { data: adminMessages } = await supabase
    .from("admin_messages").select("*, sender:profiles!created_by(full_name)")
    .order("created_at", { ascending: false }).limit(5);

  return (
    <DashboardClient
      profile={profile}
      myUpcoming={myUpcoming}
      claimableShifts={claimableShifts}
      tapsThisYear={tapsThisYear}
      incomingPlanned={incomingPlanned}
      myRank={myRank}
      adminMessages={adminMessages || []}
    />
  );
}
