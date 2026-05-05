import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (adminProfile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete assignments first
  await supabase.from("shift_assignments").delete().eq("shift_id", id);
  // Delete the shift
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { deleted: true } });
}
