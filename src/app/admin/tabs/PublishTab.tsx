"use client";
import { useState } from "react";
import { useAdminShell } from "../AdminShellContext";
import styles from "@/styles/shared.module.css";

export function PublishTab() {
  const { dateFrom, dateTo, conceptShifts, setConceptShifts } = useAdminShell();
  const [publishMsg, setPublishMsg] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch("/api/schedule/publish", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dateFrom, dateTo, message: publishMsg }) });
    if (res.ok) {
      const data = await res.json();
      alert(`🚀 Rooster gepubliceerd! ${data.data?.notified || 0} tappers genotificeerd.`);
      setConceptShifts([]);
      setPublishMsg("");
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`❌ Publiceren mislukt: ${errData.error ?? "Probeer opnieuw."}`);
    }
    setPublishing(false);
  }

  return (
    <>
      <p className={styles.sectionTitle}>Rooster publiceren</p>
      <div className={styles.card}>
        <p style={{ fontSize:13, color:"#8b80b0", marginBottom:12 }}>
          Alle concept-diensten worden live gezet. Tappers ontvangen notificatie + e-mail.
        </p>
        {conceptShifts.length > 0 && (
          <p style={{ fontSize:13, color:"#00e5c3", marginBottom:12 }}>✓ {conceptShifts.length} conceptdiensten klaar voor publicatie</p>
        )}
        <label className={styles.label}>Begeleidend bericht (optioneel)</label>
        <textarea
          className={styles.input}
          style={{ resize:"none", minHeight:80, lineHeight:1.6 }}
          placeholder="Bijv. 'Let op: mei is extra druk!'"
          value={publishMsg}
          onChange={e => setPublishMsg(e.target.value)}
        />
        <button className={styles.btnPrimary} onClick={handlePublish} disabled={publishing}>
          {publishing ? "⏳ Publiceren..." : "🚀 Rooster live zetten"}
        </button>
      </div>
    </>
  );
}
