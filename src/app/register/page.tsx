"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const token = searchParams.get("token") || "";
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pwErrors, setPwErrors] = useState<string[]>([]);

  // Valideer token bij laden
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError("Geen uitnodigingslink gevonden. Vraag een admin om een link.");
      return;
    }
    fetch(`/api/invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setTokenValid(false);
          setTokenError(data.error);
        } else {
          setTokenValid(true);
        }
      })
      .catch(() => {
        setTokenValid(false);
        setTokenError("Kon de uitnodigingslink niet valideren.");
      });
  }, [token]);

  function validatePassword(pw: string): string[] {
    const errors: string[] = [];
    if (pw.length < 8) errors.push("Minimaal 8 tekens");
    if (!/[0-9]/.test(pw)) errors.push("Minimaal 1 cijfer");
    if (!/[!@#$%^&*]/.test(pw)) errors.push("Minimaal 1 speciaal teken (!@#$%^&*)");
    return errors;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwErr = validatePassword(password);
    if (pwErr.length > 0) { setPwErrors(pwErr); return; }
    if (password !== confirmPassword) { setError("Wachtwoorden komen niet overeen."); return; }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Mark token as used
    await fetch(`/api/invite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    router.push("/dashboard");
    setLoading(false);
  }

  if (tokenValid === null) {
    return (
      <div style={s.screen}>
        <div style={s.logoMark}>🍺</div>
        <p style={{ color: "#8b80b0" }}>Link valideren...</p>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div style={s.screen}>
        <div style={s.bgGlow1} />
        <div style={s.logoMark}>⛔</div>
        <h1 style={{ ...s.title, fontSize: 22, marginBottom: 12 }}>Ongeldige link</h1>
        <p style={{ color: "#8b80b0", textAlign: "center", maxWidth: 300, marginBottom: 24 }}>
          {tokenError}
        </p>
        <a href="/login" style={s.btnPrimary}>← Terug naar inloggen</a>
      </div>
    );
  }

  return (
    <div style={s.screen}>
      <div style={s.bgGlow1} />
      <div style={s.bgGlow2} />

      <div style={s.logoMark}>🍺</div>
      <h1 style={s.title}><span style={{ color: "#00e5c3" }}>WALHALLA</span></h1>
      <p style={s.appName}>TAPROOSTER</p>
      <p style={s.sub}>Account aanmaken</p>

      <div style={s.formCard}>
        <div style={s.tokenBadge}>✅ Geldige uitnodigingslink</div>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleRegister}>
          <label style={s.label}>Volledige naam</label>
          <input
            style={s.input}
            type="text"
            placeholder="Naam Achternaam"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />

          <label style={s.label}>E-mailadres</label>
          <input
            style={s.input}
            type="email"
            placeholder="jij@email.nl"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <label style={s.label}>Wachtwoord</label>
          <input
            style={s.input}
            type="password"
            placeholder="Min. 8 tekens, 1 cijfer, 1 speciaal teken"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setPwErrors(validatePassword(e.target.value));
            }}
            required
          />

          {/* Password strength indicators */}
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
            style={{
              ...s.input,
              borderColor: confirmPassword && confirmPassword !== password ? "#ff4f6d" : "#2e2a4a",
            }}
            type="password"
            placeholder="Herhaal wachtwoord"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />

          <button style={s.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Account aanmaken..." : "Account aanmaken →"}
          </button>
        </form>

        <p style={s.loginNote}>
          Al een account?{" "}
          <a href="/login" style={{ color: "#00e5c3", textDecoration: "none" }}>
            Inloggen
          </a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={s.screen}>
        <div style={s.logoMark}>🍺</div>
        <p style={{ color: "#8b80b0" }}>Laden...</p>
      </div>
    }>
      <RegisterContent />
    </Suspense>
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
    borderRadius: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 36,
    marginBottom: 20,
    boxShadow: "0 0 40px rgba(0,229,195,0.2)",
  },
  title: {
    fontFamily: "'Exo 2', sans-serif",
    fontWeight: 900,
    fontSize: 34,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "#f0eeff",
    marginBottom: 4,
  },
  appName: {
    fontSize: 11,
    letterSpacing: 4,
    color: "#00e5c3",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: "#8b80b0", marginBottom: 24 },
  formCard: {
    width: "100%",
    maxWidth: 380,
    background: "#1a1730",
    border: "1px solid #2e2a4a",
    borderRadius: 20,
    padding: "28px 24px",
  },
  tokenBadge: {
    background: "rgba(0,229,195,0.08)",
    border: "1px solid #00e5c3",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 12,
    color: "#00e5c3",
    fontWeight: 700,
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8b80b0",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#221f38",
    border: "1px solid #2e2a4a",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#e8e0ff",
    fontFamily: "'Exo 2', sans-serif",
    fontSize: 15,
    outline: "none",
    marginBottom: 14,
    display: "block",
  },
  btnPrimary: {
    display: "block",
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #00e5c3, #00b89c)",
    color: "#0f0d1a",
    fontFamily: "'Exo 2', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1,
    border: "none",
    cursor: "pointer",
    textTransform: "uppercase",
    boxShadow: "0 4px 20px rgba(0,229,195,0.3)",
    textAlign: "center",
    textDecoration: "none",
  },
  loginNote: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 13,
    color: "#8b80b0",
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
};