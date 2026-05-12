import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  // Reset: set all assignments of this year to declined (soft reset)
  const thisYear = new Date().getFullYear();
  const { data: yearShifts } = await supabase.from("shifts")
    .select("id").gte("date", `${thisYear}-01-01`).lte("date", `${thisYear}-12-31`);
  const shiftIds = (yearShifts || []).map((s: any) => s.id);

  if (shiftIds.length > 0) {
    await supabase.from("shift_assignments")
      .delete()
      .eq("user_id", id)
      .in("shift_id", shiftIds);
  }

  return NextResponse.json({ data: { reset: true } });
}
