// POST /api/register — server-side registratie met tokenv alidatie en wachtwoordbeleid
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";

const RegisterSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z
    .string()
    .min(8, "Wachtwoord moet minimaal 8 tekens bevatten")
    .regex(/[0-9]/, "Wachtwoord moet minimaal 1 cijfer bevatten")
    .regex(/[!@#$%^&*]/, "Wachtwoord moet minimaal 1 speciaal teken bevatten (!@#$%^&*)"),
  fullName: z.string().min(1, "Naam is verplicht").max(100),
  token: z.string().min(1, "Token is verplicht"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  const { email, password, fullName, token } = parsed.data;

  const supabase = await createServerSupabaseClient();

  // Validate invite token server-side
  const { data: invite } = await supabase
    .from("invite_tokens")
    .select("id, status, expires_at")
    .eq("token", token)
    .single();

  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "Ongeldige of al gebruikte uitnodigingslink" }, { status: 400 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    await supabase.from("invite_tokens").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "Uitnodigingslink is verlopen" }, { status: 410 });
  }

  // Create user via admin client (auto-confirm email — invite token serves as verification)
  const adminClient = createAdminClient();
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName },
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message.includes("already registered")
      ? "Er bestaat al een account met dit e-mailadres"
      : "Account aanmaken mislukt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Mark token as used
  await supabase
    .from("invite_tokens")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .eq("status", "pending");

  return NextResponse.json({ data: { registered: true, userId: newUser.user?.id } });
}
