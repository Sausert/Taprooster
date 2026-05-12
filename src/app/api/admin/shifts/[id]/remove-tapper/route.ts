import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: shiftId } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }
  const userId = body.userId as string;
  const { error } = await supabase.from("shift_assignments")
    .update({ status: "declined", declined_at: new Date().toISOString() })
    .eq("shift_id", shiftId).eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { removed: true } });
}
