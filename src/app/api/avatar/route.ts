import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); } catch {
    return NextResponse.json({ error: "Ongeldige request" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Alleen afbeeldingen toegestaan" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Maximaal 4 MB per afbeelding" }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const bytes = await file.arrayBuffer();

  const adminClient = createAdminClient();
  const { error: uploadErr } = await adminClient.storage
    .from("avatars")
    .upload(path, bytes, { upsert: true, contentType: file.type });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // Use signed URL (1-year expiry) so private-bucket files resolve correctly
  const { data: signedData } = await adminClient.storage.from("avatars").createSignedUrl(path, 31536000);
  const url = signedData?.signedUrl ?? adminClient.storage.from("avatars").getPublicUrl(path).data.publicUrl;

  await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);

  return NextResponse.json({ url });
}
