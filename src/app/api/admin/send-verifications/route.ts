import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase-server";
import { sendEmailVerificationEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const adminClient = createAdminClient();

  // Fetch all auth users (paginates in batches of 1000)
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: "Gebruikers ophalen mislukt" }, { status: 500 });

  const unconfirmed = users.filter(u => !u.email_confirmed_at && u.email);

  const results = await Promise.allSettled(
    unconfirmed.map(async (u) => {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: u.email!,
        options: { redirectTo: `${APP_URL}/dashboard` },
      });
      if (!linkData?.properties?.action_link) throw new Error("Link genereren mislukt");

      const name = (u.user_metadata?.full_name as string | undefined) || u.email!;
      await sendEmailVerificationEmail(u.email!, name, linkData.properties.action_link);
      return u.email;
    })
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  const failed = results
    .filter(r => r.status === "rejected")
    .map((r, i) => ({ email: unconfirmed[i]?.email, reason: (r as PromiseRejectedResult).reason?.message }));

  return NextResponse.json({ ok: true, total: unconfirmed.length, sent, failed });
}
