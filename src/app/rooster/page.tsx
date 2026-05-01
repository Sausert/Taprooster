import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import RoosterClient from "./RoosterClient";

export default async function RoosterPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const start = now.toISOString().split("T")[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0];

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(full_name, id))")
    .eq("status", "published")
    .gte("date", start).lte("date", end)
    .order("date", { ascending: true });

  const { data: myAssignments } = await supabase
    .from("shift_assignments")
    .select("shift_id, status")
    .eq("user_id", user.id);

  const myShiftIds = new Set((myAssignments || [])
    .filter((a: any) => a.status !== "declined")
    .map((a: any) => a.shift_id));

  return (
    <RoosterClient
      shifts={shifts || []}
      myShiftIds={Array.from(myShiftIds)}
      userId={user.id}
    />
  );
}
