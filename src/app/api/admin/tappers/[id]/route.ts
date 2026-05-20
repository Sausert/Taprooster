import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TapperSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  role: z.enum(["tapper", "admin"]).optional(),
  preferred_frequency: z.number().int().min(0).max(52).optional(),
  preferred_days: z.array(z.string()).optional(),
  preferred_roles: z.array(z.string()).optional(),
  wants_parties: z.boolean().optional(),
  unavailable_months: z.array(z.number().int().min(1).max(12)).optional(),
}).strict();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Ongeldig gebruikers-ID" }, { status: 400 });
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }
  const parsed = TapperSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Ongeldige velden" }, { status: 400 });
  }
  const { full_name, email, phone, role, preferred_frequency, preferred_days, preferred_roles, wants_parties, unavailable_months } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (full_name !== undefined) updateData.full_name = full_name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (role !== undefined) {
    console.error(`[AUDIT] Rol gewijzigd: target=${id} nieuwe rol=${role} door admin=${user.id} om ${new Date().toISOString()}`);
    updateData.role = role;
  }
  if (preferred_frequency !== undefined) updateData.preferred_frequency = preferred_frequency;
  if (preferred_days !== undefined) updateData.preferred_days = preferred_days;
  if (preferred_roles !== undefined) updateData.preferred_roles = preferred_roles;
  if (wants_parties !== undefined) updateData.wants_parties = wants_parties;
  if (unavailable_months !== undefined) updateData.unavailable_months = unavailable_months;

  const { data, error } = await supabase.from("profiles")
    .update(updateData).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  return NextResponse.json({ data });
}
