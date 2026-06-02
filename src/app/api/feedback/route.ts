import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase-server";
import { sendFeedbackEmail } from "@/lib/email";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "🐛 Bug melden",
  idee: "💡 Verbetervoorstel",
  algemeen: "💬 Algemeen",
};

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }

  const category = body.category as string | undefined;
  const message = body.message as string | undefined;

  if (!category || !CATEGORY_LABELS[category]) {
    return NextResponse.json({ error: "Ongeldige categorie" }, { status: 400 });
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: "Bericht is verplicht" }, { status: 400 });
  }

  // Get sender's name
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("full_name, first_name, last_name").eq("id", user.id).single();
  const name = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.full_name || "Onbekend";

  try {
    await sendFeedbackEmail(name, user.id, CATEGORY_LABELS[category], message.trim());
  } catch {
    return NextResponse.json({ error: "Verzenden mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
