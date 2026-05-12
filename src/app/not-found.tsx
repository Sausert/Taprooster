import { APP_CONFIG } from "@/lib/config";

export default function NotFound() {
  return (
    <div style={s.screen}>
      <div style={s.glow} />
      <div style={s.icon}>🍺</div>
      <h1 style={s.title}><span style={{ color: "#00e5c3" }}>404</span> — Niet gevonden</h1>
      <p style={s.sub}>Deze pagina bestaat niet. Misschien is de link verlopen of heb je een typefout gemaakt.</p>
      <a href="/dashboard" style={s.btn}>← Terug naar dashboard</a>
      <p style={s.footer}>{APP_CONFIG.orgName}</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#0f0d1a", position: "relative", overflow: "hidden" },
  glow: { position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,195,0.06), transparent 70%)", top: -150, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" },
  icon: { fontSize: 56, marginBottom: 20 },
  title: { fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 26, color: "#f0eeff", marginBottom: 12, textAlign: "center" },
  sub: { fontSize: 14, color: "#8b80b0", maxWidth: 320, textAlign: "center", lineHeight: 1.6, marginBottom: 28 },
  btn: { padding: "12px 28px", borderRadius: 12, background: "linear-gradient(135deg, #00e5c3, #00b89c)", color: "#0f0d1a", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, textDecoration: "none", letterSpacing: 1, textTransform: "uppercase", marginBottom: 40 },
  footer: { fontSize: 11, color: "#2e2a4a", letterSpacing: 2, textTransform: "uppercase", position: "absolute", bottom: 24 },
};
