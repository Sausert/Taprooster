import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  const today = new Date().toISOString().split("T")[0];
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const thisYear = new Date().getFullYear();

  // Step 1: get published shifts in next 30 days
  const { data: upcomingShifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("status", "published")
    .gte("date", today)
    .lte("date", in30days)
    .order("date", { ascending: true });

  const upcomingShiftIds = (upcomingShifts || []).map((s: any) => s.id);

  // Step 2: get my assignments for those shifts
  let myUpcoming: any[] = [];
  if (upcomingShiftIds.length > 0) {
    const { data: myAssignments } = await supabase
      .from("shift_assignments")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "declined")
      .in("shift_id", upcomingShiftIds);

    // Join manually
    myUpcoming = (myAssignments || []).map((a: any) => ({
      ...a,
      shift: (upcomingShifts || []).find((s: any) => s.id === a.shift_id) || null,
    })).filter((a: any) => a.shift !== null)
      .sort((a: any, b: any) => a.shift.date.localeCompare(b.shift.date));
  }

  const myShiftIds = myUpcoming.map((a: any) => a.shift_id);

  // Open diensten: published, has open spots, user not assigned
  const { data: openShiftsRaw } = await supabase
    .from("shift_occupancy")
    .select("*")
    .eq("status", "published")
    .gt("open_spots", 0)
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(10);

  const claimableShifts = (openShiftsRaw || []).filter(
    (s: any) => !myShiftIds.includes(s.id)
  );

  // Stats this year - two-step query
  const { data: yearShifts } = await supabase
    .from("shifts").select("id")
    .gte("date", `${thisYear}-01-01`)
    .lte("date", `${thisYear}-12-31`);

  const yearShiftIds = (yearShifts || []).map((s: any) => s.id);
  let tapsThisYear = 0;
  if (yearShiftIds.length > 0) {
    const { count } = await supabase
      .from("shift_assignments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "declined")
      .in("shift_id", yearShiftIds);
    tapsThisYear = count || 0;
  }

  const { data: leaderboard } = await supabase
    .from("leaderboard").select("*").order("rank", { ascending: true });
  const myRank = leaderboard?.find((l: any) => l.id === user.id)?.rank || 0;

  const { data: adminMessages } = await supabase
    .from("admin_messages").select("*")
    .order("created_at", { ascending: false }).limit(3);

  return (
    <DashboardClient
      profile={profile}
      myUpcoming={myUpcoming}
      claimableShifts={claimableShifts}
      tapsThisYear={tapsThisYear}
      myRank={myRank}
      adminMessages={adminMessages || []}
    />
  );
}
