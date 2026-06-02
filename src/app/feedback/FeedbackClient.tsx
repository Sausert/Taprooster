"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import sharedStyles from "@/styles/shared.module.css";

type Category = "bug" | "idee" | "algemeen";

const CATEGORIES: { id: Category; emoji: string; label: string }[] = [
  { id: "bug",      emoji: "🐛", label: "Bug melden" },
  { id: "idee",     emoji: "💡", label: "Verbetervoorstel" },
  { id: "algemeen", emoji: "💬", label: "Algemeen" },
];

export default function FeedbackClient({ name }: { name: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("algemeen");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { setError("Vul een bericht in."); return; }
    setSending(true);
    setError("");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message: message.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Verzenden mislukt. Probeer opnieuw.");
      setSending(false);
      return;
    }

    setSent(true);
    setSending(false);
  }

  if (sent) {
    return (
      <div style={s.page}>
        <div style={s.successCard}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#f0eeff", marginBottom: 8 }}>Bedankt voor je feedback!</p>
          <p style={{ fontSize: 14, color: "#a89ec8", lineHeight: 1.5, marginBottom: 20 }}>
            Je bericht is ontvangen. We nemen het mee.
          </p>
          <button className={sharedStyles.btnPrimary} onClick={() => router.push("/account")}>
            Terug naar account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <p style={s.pageTitle}>Feedback</p>
      <p style={s.pageSubtitle}>Laat weten wat er beter kan, wat er mis gaat of wat je wilt zeggen.</p>

      <form onSubmit={handleSubmit}>
        {/* Naam (read-only) */}
        <p className={sharedStyles.sectionTitle}>Naam</p>
        <div className={sharedStyles.card} style={{ padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: "#e8e0ff", fontWeight: 600 }}>{name || "—"}</p>
        </div>

        {/* Categorie */}
        <p className={sharedStyles.sectionTitle}>Categorie</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                flex: 1,
                padding: "12px 4px",
                borderRadius: 12,
                border: category === c.id ? "1px solid #00e5c3" : "1px solid #2e2a4a",
                background: category === c.id ? "rgba(0,229,195,0.1)" : "#221f38",
                color: category === c.id ? "#00e5c3" : "#a89ec8",
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                transition: "border-color 0.15s, background 0.15s, color 0.15s",
              }}
            >
              <span style={{ fontSize: 18 }}>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Bericht */}
        <p className={sharedStyles.sectionTitle}>Bericht</p>
        <textarea
          style={s.textarea}
          placeholder="Schrijf hier je feedback..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          required
        />

        {error && (
          <div style={s.errorBox}>{error}</div>
        )}

        <button className={sharedStyles.btnPrimary} type="submit" disabled={sending} style={{ marginTop: 8 }}>
          {sending ? "Verzenden..." : "Feedback versturen →"}
        </button>
      </form>

      <button
        className={sharedStyles.btnSecondary}
        style={{ marginTop: 10 }}
        onClick={() => router.push("/account")}
      >
        Annuleren
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: "16px 16px 100px" },
  pageTitle: {
    fontFamily: "'Exo 2', sans-serif",
    fontWeight: 900,
    fontSize: 22,
    color: "#f0eeff",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#a89ec8",
    marginBottom: 20,
    lineHeight: 1.5,
  },
  textarea: {
    boxSizing: "border-box" as const,
    width: "100%",
    background: "#221f38",
    border: "1px solid #2e2a4a",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#e8e0ff",
    fontFamily: "'Exo 2', sans-serif",
    fontSize: 14,
    outline: "none",
    resize: "vertical" as const,
    marginBottom: 4,
    lineHeight: 1.5,
    display: "block",
    minHeight: 120,
  },
  errorBox: {
    background: "rgba(255,79,109,0.1)",
    border: "1px solid #ff4f6d",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#ff4f6d",
    marginBottom: 12,
    marginTop: 8,
  },
  successCard: {
    marginTop: 60,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
    padding: "32px 24px",
    background: "#1a1730",
    border: "1px solid #2e2a4a",
    borderRadius: 20,
  },
};
