// PATCH /api/shifts/[id] — dienst bewerken (admin only)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PatchSchema = z.object({
  title:      z.string().min(1).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  max_tappers:z.number().min(1).max(20).optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Ongeldig shift-ID" }, { status: 400 });
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("shifts")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Shift niet gevonden" }, { status: 404 });
  return NextResponse.json({ data });
}
