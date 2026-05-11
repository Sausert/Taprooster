import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
