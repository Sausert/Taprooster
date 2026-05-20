import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Ongeldig shift-ID" }, { status: 400 });
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  // Delete assignments first
  await supabase.from("shift_assignments").delete().eq("shift_id", id);
  // Delete the shift
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  return NextResponse.json({ data: { deleted: true } });
}
