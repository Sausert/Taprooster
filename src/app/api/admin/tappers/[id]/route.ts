import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (adminProfile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
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
