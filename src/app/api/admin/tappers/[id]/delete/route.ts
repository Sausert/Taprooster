import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (id === user.id) return NextResponse.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });

  // Delete assignments, notifications, then profile, then auth user
  await supabase.from("shift_assignments").delete().eq("user_id", id);
  await supabase.from("notifications").delete().eq("user_id", id);
  await supabase.from("tapper_preferences").delete().eq("user_id", id);
  await supabase.from("profiles").delete().eq("id", id);

  // Delete auth user (requires service role)
  const adminClient = createAdminClient();
  await adminClient.auth.admin.deleteUser(id);

  return NextResponse.json({ data: { deleted: true } });
}
