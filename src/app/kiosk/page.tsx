export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase-server";
import KioskClient from "./KioskClient";

export default async function KioskPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.KIOSK_SECRET;

  if (!secret) {
    return <KioskError message="KIOSK_SECRET is niet ingesteld in de omgevingsvariabelen." hint="Voeg KIOSK_SECRET toe in Vercel → Settings → Environment Variables en herstart de deployment." />;
  }
  if (!key || key !== secret) {
    return <KioskError message="Ongeldige of ontbrekende toegangssleutel." hint="Gebruik de URL die de admin heeft verstrekt, inclusief ?key=… parameter." />;
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const twoMonthsOut = new Date();
  twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2);
  const endDate = twoMonthsOut.toISOString().split("T")[0];

  const { data: shifts } = await admin
    .from("shifts")
    .select("*, assignments:shift_assignments(user_id, status, profile:profiles(id, full_name))")
    .eq("status", "published")
    .gte("date", today)
    .lte("date", endDate)
    .order("date", { ascending: true });

  return <KioskClient shifts={shifts ?? []} accessKey={key} />;
}

function KioskError({ message, hint }: { message: string; hint: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: 40 }}>
      <div style={{ background: "#1a1730", border: "1px solid #ff4f6d", borderRadius: 16, padding: "40px 48px", maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
        <div style={{ color: "#f0eeff", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{message}</div>
        <div style={{ color: "#8b80b0", fontSize: 14, lineHeight: 1.6 }}>{hint}</div>
      </div>
    </div>
  );
}
