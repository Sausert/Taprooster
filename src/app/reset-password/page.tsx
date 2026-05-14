"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase sends the user back with a token_hash in the URL for PKCE flow
    // The client automatically exchanges it on load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    // Also check if user already has a session (tab reload case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  function validatePassword(pw: string): string[] {
    const errors: string[] = [];
    if (pw.length < 8) errors.push("Minimaal 8 tekens");
    if (!/[0-9]/.test(pw)) errors.push("Minimaal 1 cijfer");
    if (!/[!@#$%^&*]/.test(pw)) errors.push("Minimaal 1 speciaal teken (!@#$%^&*)");
    return errors;
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pwErr = validatePassword(password);
    if (pwErr.length > 0) { setError(pwErr.join(", ")); return; }
    if (password !== confirmPassword) { setError("Wachtwoorden komen niet overeen."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div style={s.screen}>
        <div style={s.logoMark}>✅</div>
        <h1 style={s.title}>Wachtwoord gewijzigd!</h1>
        <p style={{ color: "#8b80b0", marginTop: 8 }}>Je wordt doorgestuurd naar het dashboard...</p>
      </div>
    );
  }

  return (
    <div style={s.screen}>
      <div style={s.bgGlow} />
      <div style={s.logoMark}>🔑</div>
      <h1 style={s.title}><span style={{ color: "#00e5c3" }}>WALHALLA</span></h1>
      <p style={s.appName}>TAPROOSTER</p>
      <p style={s.sub}>Nieuw wachtwoord instellen</p>

      {!sessionReady ? (
        <div style={s.formCard}>
          <p style={{ color: "#8b80b0", textAlign: "center", fontSize: 13 }}>
            Link valideren...
          </p>
        </div>
      ) : (
        <div style={s.formCard}>
          {error && <div style={s.errorBox}>{error}</div>}
          <form onSubmit={handleReset}>
            <label style={s.label}>Nieuw wachtwoord</label>
            <input
              style={s.input}
              type="password"
              placeholder="Min. 8 tekens, 1 cijfer, 1 speciaal teken"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <div style={{ marginBottom: 14 }}>
              {[
                { label: "Minimaal 8 tekens", ok: password.length >= 8 },
                { label: "Minimaal 1 cijfer", ok: /[0-9]/.test(password) },
                { label: "Minimaal 1 speciaal teken", ok: /[!@#$%^&*]/.test(password) },
              ].map(rule => (
                <div key={rule.label} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: password.length === 0 ? "#2e2a4a" : rule.ok ? "#00e5c3" : "#ff4f6d" }}>
                    {password.length === 0 ? "○" : rule.ok ? "✓" : "✗"}
                  </span>
                  <span style={{ fontSize: 12, color: password.length === 0 ? "#8b80b0" : rule.ok ? "#00e5c3" : "#ff4f6d" }}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
            <label style={s.label}>Bevestig wachtwoord</label>
            <input
              style={{ ...s.input, borderColor: confirmPassword && confirmPassword !== password ? "#ff4f6d" : "#2e2a4a" }}
              type="password"
              placeholder="Herhaal wachtwoord"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Opslaan..." : "🔑 Sla nieuw wachtwoord op"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={s.screen}>
        <div style={s.logoMark}>🔑</div>
        <p style={{ color: "#8b80b0" }}>Laden...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#0f0d1a", position: "relative", overflow: "hidden" },
  bgGlow: { position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,195,0.06), transparent 70%)", top: -150, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" },
  logoMark: { width: 80, height: 80, background: "rgba(0,229,195,0.1)", border: "2px solid #00e5c3", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 20, boxShadow: "0 0 40px rgba(0,229,195,0.2)" },
  title: { fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 34, letterSpacing: 4, textTransform: "uppercase" as const, color: "#f0eeff", marginBottom: 4 },
  appName: { fontSize: 11, letterSpacing: 4, color: "#00e5c3", fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 4 },
  sub: { fontSize: 13, color: "#8b80b0", marginBottom: 24 },
  formCard: { width: "100%", maxWidth: 380, background: "#1a1730", border: "1px solid #2e2a4a", borderRadius: 20, padding: "28px 24px" },
  label: { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const, color: "#8b80b0", marginBottom: 6 },
  input: { width: "100%", background: "#221f38", border: "1px solid #2e2a4a", borderRadius: 10, padding: "12px 14px", color: "#e8e0ff", fontFamily: "'Exo 2', sans-serif", fontSize: 15, outline: "none", marginBottom: 14, display: "block", boxSizing: "border-box" as const },
  btnPrimary: { display: "block", width: "100%", padding: "14px", borderRadius: 12, background: "linear-gradient(135deg, #00e5c3, #00b89c)", color: "#0f0d1a", fontFamily: "'Exo 2', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 1, border: "none", cursor: "pointer", textTransform: "uppercase" as const, boxShadow: "0 4px 20px rgba(0,229,195,0.3)", textAlign: "center" as const },
  errorBox: { background: "rgba(255,79,109,0.1)", border: "1px solid #ff4f6d", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ff4f6d", marginBottom: 16 },
};
