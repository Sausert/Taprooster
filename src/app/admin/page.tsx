import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  const end = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-31`;

  // Shifts voor healthcheck (published, deze maand)
  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(full_name))")
    .eq("status", "published")
    .gte("date", start).lte("date", end)
    .order("date", { ascending: true });

  // Gepubliceerde shifts (komende 3 maanden) voor rooster bewerken
  const in3months = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0];
  const { data: publishedShifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
    .eq("status", "published")
    .gte("date", start).lte("date", in3months)
    .order("date", { ascending: true });

  const { data: profiles } = await supabase
    .from("profiles").select("*").order("full_name", { ascending: true });

  const { data: leaderboard } = await supabase
    .from("leaderboard").select("*").order("rank", { ascending: true });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"#0f0d1a", maxWidth:430, margin:"0 auto" }}>
      <AdminClient
        shifts={shifts || []}
        profiles={profiles || []}
        leaderboard={leaderboard || []}
        publishedShifts={publishedShifts || []}
      />
    </div>
  );
}
