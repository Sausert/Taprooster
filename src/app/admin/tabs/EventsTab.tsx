"use client";
import { useState } from "react";
import { useAdminShell } from "../AdminShellContext";
import { TimeSelect } from "../components/TimeSelect";
import styles from "@/styles/shared.module.css";

const emptyShift = () => ({ role: "tapper" as "tapper" | "bonnenkassa", start_time: "20:00", end_time: "02:00", max_tappers: 2 });

export function EventsTab() {
  const { setConceptShifts, setPublished } = useAdminShell();
  const [eventForm, setEventForm] = useState({ title: "", date: "", shifts: [emptyShift()] });
  const [saving, setSaving] = useState(false);
  const [eventError, setEventError] = useState("");

  const [createdFeestje, setCreatedFeestje] = useState<{ title: string; shiftIds: string[]; shifts: any[] } | null>(null);
  const [publishMsg, setPublishMsg] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; text: string } | null>(null);

  function addShift() { setEventForm(f => ({ ...f, shifts: [...f.shifts, emptyShift()] })); }
  function removeShift(idx: number) { setEventForm(f => ({ ...f, shifts: f.shifts.filter((_, i) => i !== idx) })); }
  function updateShift(idx: number, field: string, value: unknown) {
    setEventForm(f => ({ ...f, shifts: f.shifts.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
    const data = await res.json();
    if (res.ok && data.data?.shifts) {
      const shifts = data.data.shifts;
      setConceptShifts(cs => [...cs, ...shifts]);
      setCreatedFeestje({ title: eventForm.title, shiftIds: shifts.map((s: any) => s.id), shifts });
      setEventForm({ title: "", date: "", shifts: [emptyShift()] });
      setPublishMsg("");
      setPublishResult(null);
    } else {
      const errMsg = typeof data.error === "string" ? data.error : "Aanmaken mislukt. Controleer de invoer en probeer opnieuw.";
      setEventError(errMsg);
      setTimeout(() => setEventError(""), 5000);
    }
    setSaving(false);
  }

  async function handlePublishFeestje() {
    if (!createdFeestje) return;
    setPublishing(true);
    setPublishResult(null);
    const res = await fetch("/api/schedule/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftIds: createdFeestje.shiftIds, message: publishMsg || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      const notified = data.data?.notified || 0;
      setPublishResult({ ok: true, text: `Feestje gepubliceerd! ${notified} tapper${notified !== 1 ? "s" : ""} genotificeerd.` });
      setConceptShifts(cs => cs.filter(s => !createdFeestje.shiftIds.includes(s.id)));
      setPublished(ps => [...ps, ...createdFeestje.shifts.map((s: any) => ({ ...s, status: "published" }))]);
      // Delay clearing so success message is visible for a moment
      setTimeout(() => setCreatedFeestje(null), 3000);
    } else {
      setPublishResult({ ok: false, text: `Publiceren mislukt: ${data.error ?? "Probeer opnieuw."}` });
    }
    setPublishing(false);
  }

  return (
    <>
      {eventError && (
        <div className={styles.bannerIn} style={{ background:"rgba(255,79,109,0.08)", border:"1px solid #ff4f6d", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#ff4f6d", fontWeight:700, marginBottom:12 }}>
          {eventError}
        </div>
      )}

      {createdFeestje && (
        <div className={`${styles.card} ${styles.bannerIn}`} style={{ borderColor:"#00e5c3", marginBottom:16 }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#00e5c3", marginBottom:4 }}>{createdFeestje.title} aangemaakt!</p>
          <p style={{ fontSize:12, color:"#b8b0d4", marginBottom:12, lineHeight:1.5 }}>
            {createdFeestje.shiftIds.length} dienst{createdFeestje.shiftIds.length !== 1 ? "en" : ""} staan als concept klaar. Publiceer nu om alle tappers te notificeren.
          </p>
          {publishResult && (
            <div className={styles.bannerIn} style={{ background: publishResult.ok ? "rgba(0,229,195,0.08)" : "rgba(255,79,109,0.08)", border:`1px solid ${publishResult.ok ? "#00e5c3" : "#ff4f6d"}`, borderRadius:8, padding:"8px 12px", fontSize:13, color: publishResult.ok ? "#00e5c3" : "#ff4f6d", fontWeight:700, marginBottom:12 }}>
              {publishResult.text}
            </div>
          )}
          {!publishResult?.ok && (
            <>
              <label className={styles.label}>Optioneel bericht aan tappers</label>
              <textarea
                className={styles.input}
                rows={2}
                value={publishMsg}
                onChange={e => setPublishMsg(e.target.value)}
                placeholder="Bijv. Aanmelden kan tot vrijdag..."
                style={{ resize:"none", marginBottom:10 }}
              />
              <button className={styles.btnPrimary} onClick={handlePublishFeestje} disabled={publishing}>
                {publishing ? "Publiceren..." : "Feestje publiceren"}
              </button>
              <button className={styles.btnSecondary} style={{ marginTop:8 }} onClick={() => setCreatedFeestje(null)}>
                Later publiceren
              </button>
            </>
          )}
        </div>
      )}

      <p className={styles.sectionTitle}>Feestje aanmaken</p>
      <form onSubmit={handleSubmit}>
        <div className={styles.card} style={{ marginBottom:12 }}>
          <label className={styles.label}>Naam</label>
          <input className={styles.input} value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Bijv. Oud & Nieuw..." required />
          <label className={styles.label}>Datum</label>
          <input className={styles.input} type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} required />
        </div>

        <p className={styles.sectionTitle}>Diensten</p>
        {eventForm.shifts.map((shift, idx) => (
          <div key={idx} className={styles.card} style={{ marginBottom:10, borderLeft:`4px solid ${shift.role === "bonnenkassa" ? "#ffb547" : "#00e5c3"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color: shift.role === "bonnenkassa" ? "#ffb547" : "#00e5c3", textTransform:"uppercase", letterSpacing:"0.12em" }}>
                Dienst {idx + 1}
              </span>
              {eventForm.shifts.length > 1 && (
                <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => removeShift(idx)}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {(["tapper", "bonnenkassa"] as const).map(r => (
                <div key={r} className={`${styles.chip}${shift.role === r ? ` ${styles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => updateShift(idx, "role", r)}>
                  {r === "bonnenkassa" ? "Kassa" : "Tapper"}
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <label className={styles.label}>Start</label>
                <TimeSelect value={shift.start_time} onChange={v => updateShift(idx, "start_time", v)} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <label className={styles.label}>Eind</label>
                <TimeSelect value={shift.end_time} onChange={v => updateShift(idx, "end_time", v)} />
              </div>
            </div>
            <label className={styles.label}>Aantal personen</label>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button type="button" className={styles.iconBtn} style={{ fontSize:18 }} onClick={() => updateShift(idx, "max_tappers", Math.max(1, shift.max_tappers - 1))}>−</button>
              <div style={{ textAlign:"center", minWidth:40 }}>
                <span style={{ fontFamily:"monospace", fontSize:22, color:"#00e5c3", display:"block", lineHeight:1 }}>{shift.max_tappers}</span>
                <span style={{ fontSize:10, color:"#b8b0d4", textTransform:"uppercase", letterSpacing:"0.08em" }}>personen</span>
              </div>
              <button type="button" className={styles.iconBtn} style={{ fontSize:18 }} onClick={() => updateShift(idx, "max_tappers", Math.min(20, shift.max_tappers + 1))}>+</button>
            </div>
          </div>
        ))}

        <div style={{ borderTop:"1px solid #2e2a4a", marginTop:4, paddingTop:12 }}>
          <button type="button" className={styles.btnSecondary} style={{ marginBottom:10 }} onClick={addShift}>+ Dienst toevoegen</button>
          <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Aanmaken..." : "Feestje aanmaken"}</button>
        </div>
      </form>
    </>
  );
}
