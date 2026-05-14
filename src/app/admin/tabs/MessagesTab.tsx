"use client";
import { useState, useEffect } from "react";
import type { AdminMessage } from "@/types";
import styles from "@/styles/shared.module.css";

export function MessagesTab() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/messages")
      .then(r => r.json())
      .then(d => { if (d.data) setMessages(d.data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Verzenden mislukt. Probeer opnieuw.");
    } else {
      setMessages(prev => [data.data, ...prev].slice(0, 3));
      setTitle("");
      setBody("");
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    }
    setSending(false);
  }

  return (
    <>
      {sent && (
        <div style={{ background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center", marginBottom:12 }}>
          ✅ Bericht verzonden! Alle tappers zijn genotificeerd.
        </div>
      )}

      <p className={styles.sectionTitle}>Nieuw bericht plaatsen</p>
      <form onSubmit={handleSubmit}>
        <div className={styles.card} style={{ marginBottom:12 }}>
          <label className={styles.label}>Titel</label>
          <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Bijv. Kantine gesloten..." required />
          <label className={styles.label}>Bericht</label>
          <textarea
            className={styles.input}
            style={{ minHeight:100, resize:"vertical" as const, fontFamily:"'Exo 2', sans-serif" }}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Schrijf hier je bericht voor alle tappers..."
            required
          />
          {error && <p style={{ fontSize:12, color:"#ff4f6d", marginTop:4 }}>{error}</p>}
          <button className={styles.btnPrimary} type="submit" disabled={sending}>
            {sending ? "Verzenden..." : "📢 Bericht versturen"}
          </button>
          <p style={{ fontSize:11, color:"#8b80b0", marginTop:8 }}>
            Alle tappers ontvangen direct een in-app notificatie en e-mail.
          </p>
        </div>
      </form>

      <p className={styles.sectionTitle}>Recente berichten</p>
      {loading && <div style={{ textAlign:"center", padding:20, color:"#8b80b0", fontSize:13 }}>Laden...</div>}
      {!loading && messages.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px 20px" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
          <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Nog geen berichten</p>
        </div>
      )}
      {messages.map(msg => (
        <div key={msg.id} className={styles.card} style={{ marginBottom:10 }}>
          <div style={{ display:"flex", gap:10 }}>
            <span style={{ fontSize:20 }}>📢</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", marginBottom:4 }}>{msg.title}</p>
              <p style={{ fontSize:12, color:"#8b80b0", lineHeight:1.5 }}>{msg.body}</p>
              <p style={{ fontSize:11, color:"#8b80b0", marginTop:6 }}>
                {new Date(msg.created_at).toLocaleString("nl-NL", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
