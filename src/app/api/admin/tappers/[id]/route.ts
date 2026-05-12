import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

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
  if (role !== undefined) updateData.role = role;
  if (preferred_frequency !== undefined) updateData.preferred_frequency = preferred_frequency;
  if (preferred_days !== undefined) updateData.preferred_days = preferred_days;
  if (preferred_roles !== undefined) updateData.preferred_roles = preferred_roles;
  if (wants_parties !== undefined) updateData.wants_parties = wants_parties;
  if (unavailable_months !== undefined) updateData.unavailable_months = unavailable_months;

  const { data, error } = await supabase.from("profiles")
    .update(updateData).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
