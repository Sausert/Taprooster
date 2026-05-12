import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/api-helpers";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

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
