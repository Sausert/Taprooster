export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import FeedbackClient from "./FeedbackClient";

export default async function FeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, first_name, last_name").eq("id", user.id).single();
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.full_name || "";

  return <FeedbackClient name={displayName} />;
}
