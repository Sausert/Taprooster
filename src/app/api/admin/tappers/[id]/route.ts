import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Ongeldig gebruikers-ID" }, { status: 400 });
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }
  const {
    full_name, email, phone, role,
    // Preference fields
    preferred_frequency, preferred_days, preferred_roles, wants_parties, unavailable_months,
  } = body;

  const updateData: Record<string, any> = {};
  if (full_name !== undefined) updateData.full_name = full_name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (role !== undefined) {
    if (role !== "tapper" && role !== "admin") {
      return NextResponse.json({ error: "Ongeldige rol. Kies 'tapper' of 'admin'." }, { status: 400 });
    }
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
