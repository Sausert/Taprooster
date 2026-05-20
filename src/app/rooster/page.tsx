export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";
import RoosterClient from "./RoosterClient";

export default async function RoosterPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const start = now.toISOString().split("T")[0];
  const endOfNextYear = `${now.getFullYear() + 1}-12-31`;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  // Use adminClient so RLS doesn't hide other tappers' assignments
  const adminClient = createAdminClient();
  const { data: shifts } = await adminClient
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
    .eq("status", "published")
    .gte("date", start).lte("date", endOfNextYear)
    .order("date", { ascending: true });

  const { data: myAssignments } = await supabase
    .from("shift_assignments")
    .select("shift_id, status")
    .eq("user_id", user.id);

  const myShiftIds = (myAssignments || [])
    .filter((a: any) => a.status !== "declined")
    .map((a: any) => a.shift_id);

  return (
    <RoosterClient
      shifts={shifts || []}
      myShiftIds={myShiftIds}
      userId={user.id}
      userAssignments={myAssignments || []}
      isAdmin={profile?.role === "admin"}
    />
  );
}
