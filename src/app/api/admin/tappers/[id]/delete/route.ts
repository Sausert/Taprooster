import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/api-helpers";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  if (id === user.id) return NextResponse.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });

  // Delete related data first (cleanup — errors are non-fatal)
  await supabase.from("shift_assignments").delete().eq("user_id", id);
  await supabase.from("notifications").delete().eq("user_id", id);
  await supabase.from("tapper_preferences").delete().eq("user_id", id);

  // Delete profile — stop if this fails (auth user deletion would be orphaned)
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Delete auth user (requires service role)
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.deleteUser(id);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  return NextResponse.json({ data: { deleted: true } });
}
