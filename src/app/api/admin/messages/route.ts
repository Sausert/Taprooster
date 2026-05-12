import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { sendAdminMessageEmail } from "@/lib/email";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data: messages, error } = await supabase
    .from("admin_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: messages });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }

  const title = body.title as string | undefined;
  const msgBody = body.body as string | undefined;
  if (!title?.trim() || !msgBody?.trim()) {
    return NextResponse.json({ error: "Titel en bericht zijn verplicht" }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("admin_messages")
    .insert({ title: title.trim(), body: msgBody.trim(), created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all tappers
  const { data: allProfiles } = await supabase.from("profiles").select("id, email, full_name");

  if (allProfiles && allProfiles.length > 0) {
    await supabase.from("notifications").insert(
      allProfiles.map(p => ({
        user_id: p.id,
        type: "admin_message",
        title: `📢 ${title.trim()}`,
        message: msgBody.trim(),
        read: false,
      }))
    );

    await Promise.allSettled(
      allProfiles.map(p => sendAdminMessageEmail(p.email, p.full_name, title.trim(), msgBody.trim()))
    );
  }

  return NextResponse.json({ data: message });
}
