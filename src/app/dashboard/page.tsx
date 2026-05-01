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

  // Mijn diensten komende 30 dagen
  const { data: myUpcomingRaw } = await supabase
    .from("shift_assignments")
    .select("*, shift:shifts(*)")
    .eq("user_id", user.id)
    .neq("status", "declined")
    .gte("shift.date", today)
    .lte("shift.date", in30days)
    .order("shift.date", { ascending: true });

  // Filter null shifts (join kan null opleveren bij filtering)
  const myUpcoming = (myUpcomingRaw || []).filter((a: any) => a.shift !== null);

  // Open diensten (gepubliceerd, niet vol, ik ben niet al ingeschreven)
  const myShiftIds = myUpcoming.map((a: any) => a.shift_id);
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

  // Statistieken dit jaar
  const { count: tapsThisYear } = await supabase
    .from("shift_assignments")
    .select("*, shifts!inner(date)", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "declined")
    .gte("shifts.date", `${thisYear}-01-01`)
    .lte("shifts.date", `${thisYear}-12-31`);

  // Leaderboard rank
  const { data: leaderboard } = await supabase
    .from("leaderboard").select("*").order("rank", { ascending: true });
  const myRank = leaderboard?.find((l: any) => l.id === user.id)?.rank || 0;

  // Admin berichten
  const { data: adminMessages } = await supabase
    .from("admin_messages").select("*")
    .order("created_at", { ascending: false }).limit(3);

  return (
    <DashboardClient
      profile={profile}
      myUpcoming={myUpcoming}
      claimableShifts={claimableShifts}
      tapsThisYear={tapsThisYear || 0}
      myRank={myRank}
      adminMessages={adminMessages || []}
    />
  );
}
