import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Ongeldig bericht-ID" }, { status: 400 });
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 }); }

  const title = body.title as string | undefined;
  const msgBody = body.body as string | undefined;
  if (!title?.trim() || !msgBody?.trim()) {
    return NextResponse.json({ error: "Titel en bericht zijn verplicht" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("admin_messages")
    .update({ title: title.trim(), body: msgBody.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Ongeldig bericht-ID" }, { status: 400 });
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { error } = await supabase.from("admin_messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  return NextResponse.json({ data: { deleted: true } });
}
