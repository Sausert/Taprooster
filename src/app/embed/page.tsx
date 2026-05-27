export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase-server";
import EmbedClient from "./EmbedClient";

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.EMBED_SECRET;

  if (!secret || key !== secret) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#ff4f6d", fontFamily: "monospace", fontSize: 14 }}>403 — Ongeldige embed-sleutel</p>
      </div>
    );
  }

  const admin = createAdminClient();
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate   = `${currentYear + 1}-12-31`;

  const { data: shifts } = await admin
    .from("shifts")
    .select("id, title, date, start_time, end_time, max_tappers, type, role, assignments:shift_assignments(user_id, status)")
    .eq("status", "published")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  return <EmbedClient shifts={shifts || []} />;
}
