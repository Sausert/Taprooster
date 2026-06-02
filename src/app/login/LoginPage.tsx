"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import sharedStyles from "@/styles/shared.module.css";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Onjuist e-mailadres of wachtwoord.");
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setSuccess("Check je inbox voor de herstellink!");
    setLoading(false);
  }

  return (
    <div style={s.screen}>
      <div style={s.bgGlow1} />
      <div style={s.bgGlow2} />

      <div style={s.logoMark}>🍺</div>
      <h1 style={s.title}><span style={s.titleAccent}>WALHALLA</span></h1>
      <p style={s.appName}>TAPROOSTER</p>
      <p style={s.sub}>OJC Walhalla · Sevenum</p>

      <div style={s.formCard}>
        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <p style={s.formTitle}>Inloggen</p>

            {error && <div style={s.errorBox}>{error}</div>}

            <label htmlFor="login-email" className={sharedStyles.label}>E-mailadres</label>
            <input
              id="login-email"
              className={sharedStyles.input}
              type="email"
              placeholder="jij@email.nl"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <label htmlFor="login-password" className={sharedStyles.label}>Wachtwoord</label>
            <input
              id="login-password"
              className={sharedStyles.input}
              type="password"
              placeholder="Jouw wachtwoord"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <button type="button" style={{ ...s.link, background:"none", border:"none", padding:0, cursor:"pointer", fontFamily:"'Exo 2', sans-serif" }} onClick={() => setMode("forgot")}>
                Wachtwoord vergeten?
              </button>
            </div>

            <button className={sharedStyles.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Bezig..." : "Inloggen →"}
            </button>

          </form>
        ) : (
          <form onSubmit={handleForgot}>
            <p style={s.formTitle}>Wachtwoord herstellen</p>
            <p style={s.subText}>We sturen je een herstellink per e-mail.</p>

            {error && <div style={s.errorBox}>{error}</div>}
            {success && <div style={s.successBox}>{success}</div>}

            <label htmlFor="forgot-email" className={sharedStyles.label}>E-mailadres</label>
            <input
              id="forgot-email"
              className={sharedStyles.input}
              type="email"
              placeholder="jij@email.nl"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <button className={sharedStyles.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Bezig..." : "Verstuur herstellink"}
            </button>
            <button
              type="button"
              className={sharedStyles.btnSecondary}
              style={{ marginTop: 8 }}
              onClick={() => setMode("login")}
            >
              ← Terug naar inloggen
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    background: "#0f0d1a",
    position: "relative",
    overflow: "hidden",
  },
  bgGlow1: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,229,195,0.06), transparent 70%)",
    top: -150,
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,47,110,0.5), transparent 70%)",
    bottom: 80,
    right: -80,
    pointerEvents: "none",
  },
  logoMark: {
    width: 80,
    height: 80,
    background: "rgba(0,229,195,0.1)",
    border: "2px solid #00e5c3",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 36,
    marginBottom: 20,
    boxShadow: "0 0 40px rgba(0,229,195,0.25), inset 0 0 0 1px rgba(0,229,195,0.3)",
  },
  title: {
    fontFamily: "'Exo 2', sans-serif",
    fontWeight: 900,
    fontSize: 34,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#f0eeff",
    marginBottom: 4,
  },
  titleAccent: { color: "#00e5c3" },
  appName: {
    fontSize: 11,
    letterSpacing: "0.2em",
    color: "#00e5c3",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: "#a89ec8", marginBottom: 36 },
  formCard: {
    width: "100%",
    maxWidth: 380,
    background: "#1a1730",
    border: "1px solid #2e2a4a",
    borderRadius: 20,
    padding: "28px 24px",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f0eeff",
    marginBottom: 20,
    fontFamily: "'Exo 2', sans-serif",
  },
  subText: { fontSize: 13, color: "#a89ec8", marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#a89ec8",
    marginBottom: 6,
  },
  link: {
    color: "#00e5c3",
    cursor: "pointer",
    fontSize: 13,
    textDecoration: "none",
  },
  registerNote: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 13,
    color: "#a89ec8",
  },
  errorBox: {
    background: "rgba(255,79,109,0.1)",
    border: "1px solid #ff4f6d",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#ff4f6d",
    marginBottom: 16,
  },
  successBox: {
    background: "rgba(0,229,195,0.08)",
    border: "1px solid #00e5c3",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#00e5c3",
    marginBottom: 16,
  },
};
