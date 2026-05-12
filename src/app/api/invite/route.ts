// app/api/invite/route.ts — Uitnodigingslinks beheren
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";
import { sendInviteEmail } from "@/lib/email";
import QRCode from "qrcode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST /api/invite — maak nieuw token aan
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* body is optioneel */ }
  const email = body.email as string | undefined; // optioneel: stuur direct naar e-mailadres

  // Maak token aan
  const { data: invite, error } = await supabase
    .from("invite_tokens")
    .insert({ created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inviteUrl = `${APP_URL}/register?token=${invite.token}`;

  // Genereer QR code als base64 data URL
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 256,
    margin: 2,
    color: { dark: "#0f0d1a", light: "#ffffff" },
  });

  // Stuur e-mail als adres opgegeven
  if (email) {
    await sendInviteEmail(email, invite.token, profile.full_name);
  }

  return NextResponse.json({
    data: {
      token: invite.token,
      url: inviteUrl,
      qrCode: qrDataUrl,
      expiresAt: invite.expires_at,
    },
  });
}

// GET /api/invite?token=xxx — valideer token
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: invite, error } = await supabase
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Ongeldige uitnodigingslink" }, { status: 404 });
  }

  if (invite.status === "used") {
    return NextResponse.json({ error: "Deze link is al gebruikt" }, { status: 410 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from("invite_tokens")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return NextResponse.json({ error: "Deze link is verlopen" }, { status: 410 });
  }

  return NextResponse.json({ data: { valid: true, expiresAt: invite.expires_at } });
}
