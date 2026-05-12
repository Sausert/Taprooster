"use client";
import { useState } from "react";
import styles from "@/styles/shared.module.css";

export function InviteTab() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);

  async function handleCreateInvite() {
    setInviteLoading(true);
    const res = await fetch("/api/invite", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email: inviteEmail || undefined }) });
    const data = await res.json();
    if (data.data) { setInviteUrl(data.data.url); setQrCode(data.data.qrCode); }
    setInviteLoading(false);
  }

  return (
    <>
      <p className={styles.sectionTitle}>Nieuwe uitnodiging</p>
      <div className={styles.card}>
        <label className={styles.label}>Stuur direct per e-mail (optioneel)</label>
        <input className={styles.input} type="email" placeholder="e-mailadres" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
        <button className={styles.btnPrimary} onClick={handleCreateInvite} disabled={inviteLoading}>
          {inviteLoading ? "Genereren..." : "🔗 Genereer uitnodigingslink"}
        </button>
      </div>

      {inviteUrl && (
        <>
          <p className={styles.sectionTitle}>Uitnodigingslink</p>
          <div className={styles.card}>
            <div style={{ background:"#0f0d1a", borderRadius:10, padding:"10px 12px", fontFamily:"monospace", fontSize:11, color:"#00e5c3", wordBreak:"break-all", marginBottom:10 }}>{inviteUrl}</div>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteUrl); setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2000); }}
              style={{ padding:"8px 16px", borderRadius:12, background:copiedInvite ? "rgba(0,229,195,0.15)" : "#221f38", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:13, fontWeight:700, cursor:"pointer", width:"100%", marginTop:8 }}
            >
              {copiedInvite ? "✅ Gekopieerd!" : "📋 Kopieer link"}
            </button>
          </div>

          {qrCode && (
            <>
              <p className={styles.sectionTitle}>QR Code</p>
              <div style={{ borderWidth:2, borderStyle:"dashed", borderColor:"#00e5c3", borderRadius:16, padding:24, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                <img src={qrCode} alt="QR Code" style={{ width:160, height:160, borderRadius:10 }} />
                <a href={qrCode} download="walhalla-invite-qr.png" className={styles.btnSecondary} style={{ padding:"10px 20px", width:"auto" }}>⬇️ Download QR</a>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
