"use client";
import { useState, useEffect } from "react";
import type { AdminMessage } from "@/types";
import styles from "@/styles/shared.module.css";

const MegaphoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b8b0d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11l18-5v12L3 13M11.6 16.8a3 3 0 11-5.8-1.6"/>
  </svg>
);

export function MessagesTab() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      setMessages(prev => [data.data, ...prev].slice(0, 5));
      setTitle("");
      setBody("");
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    }
    setSending(false);
  }

  function startEdit(msg: AdminMessage) {
    setEditingId(msg.id);
    setEditTitle(msg.title);
    setEditBody(msg.body);
    setEditError(null);
  }

  async function handleEditSave(id: string) {
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, body: editBody }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEditError(data.error ?? "Bijwerken mislukt.");
    } else {
      setMessages(prev => prev.map(m => m.id === id ? data.data : m));
      setEditingId(null);
    }
    setEditSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
    setDeletingId(null);
  }

  return (
    <>
      {sent && (
        <div style={{ background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center", marginBottom:12 }}>
          Bericht verzonden! Alle tappers zijn genotificeerd.
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
            maxLength={500}
            required
          />
          <p style={{ fontSize:11, color: body.length > 450 ? "#ffb547" : "#8b80b0", marginTop:-10, marginBottom:8, textAlign:"right" }}>{body.length}/500</p>
          {error && <p style={{ fontSize:12, color:"#ff4f6d", marginTop:4 }}>{error}</p>}
          <button className={styles.btnPrimary} type="submit" disabled={sending}>
            {sending ? "Verzenden..." : "Bericht versturen"}
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
          <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}><MegaphoneIcon /></div>
          <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Nog geen berichten</p>
        </div>
      )}
      {messages.map(msg => (
        <div key={msg.id} className={styles.card} style={{ marginBottom:10 }}>
          {editingId === msg.id ? (
            <div>
              <label className={styles.label}>Titel</label>
              <input className={styles.input} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              <label className={styles.label}>Bericht</label>
              <textarea className={styles.input} style={{ minHeight:80, resize:"vertical" as const }} value={editBody} onChange={e => setEditBody(e.target.value)} maxLength={500} />
              {editError && <p style={{ fontSize:12, color:"#ff4f6d", marginBottom:8 }}>{editError}</p>}
              <div style={{ display:"flex", gap:8 }}>
                <button className={styles.btnPrimary} style={{ flex:1 }} onClick={() => handleEditSave(msg.id)} disabled={editSaving}>
                  {editSaving ? "Opslaan..." : "Opslaan"}
                </button>
                <button className={styles.btnSecondary} style={{ flex:1 }} onClick={() => setEditingId(null)}>Annuleren</button>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ paddingTop:2, flexShrink:0 }}><MegaphoneIcon /></div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", marginBottom:4 }}>{msg.title}</p>
                <p style={{ fontSize:12, color:"#b8b0d4", lineHeight:1.5 }}>{msg.body}</p>
                <p style={{ fontSize:11, color:"#8b80b0", marginTop:6 }}>
                  {new Date(msg.created_at).toLocaleString("nl-NL", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                </p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                <button
                  className={`${styles.iconBtn}`}
                  onClick={() => startEdit(msg)}
                  aria-label="Bericht bewerken"
                  title="Bewerken"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  onClick={() => handleDelete(msg.id)}
                  disabled={deletingId === msg.id}
                  aria-label="Bericht verwijderen"
                  title="Verwijderen"
                >
                  {deletingId === msg.id ? (
                    <span style={{ fontSize:11 }}>...</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
