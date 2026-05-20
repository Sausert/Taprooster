export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AccountClient from "./AccountClient";

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  const { data: leaderboard } = await supabase.from("leaderboard").select("*").order("rank", { ascending: true });
  const { data: notifications } = await supabase
    .from("notifications").select("*, shift:shifts!shift_id(date, start_time)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(60);

  return (
    <AccountClient
      profile={profile}
      leaderboard={leaderboard || []}
      notifications={notifications || []}
    />
  );
}
