"use client";
import { useState } from "react";
import { useAdminShell } from "../AdminShellContext";
import styles from "@/styles/shared.module.css";

const emptyShift = () => ({ role: "tapper" as "tapper" | "bonnenkassa", start_time: "20:00", end_time: "02:00", max_tappers: 2 });

const s: Record<string, React.CSSProperties> = {
  iconBtn: { background:"#221f38", border:"1px solid #2e2a4a", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14, color:"#e8e0ff" },
  savedBanner: { background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center" as const, marginBottom:12 },
};

export function EventsTab() {
  const { setConceptShifts } = useAdminShell();
  const [eventForm, setEventForm] = useState({ title: "", date: "", shifts: [emptyShift()] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    if (res.ok) {
      if (data.data?.shifts) setConceptShifts(cs => [...cs, ...data.data.shifts]);
      setEventForm({ title: "", date: "", shifts: [emptyShift()] });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } else {
      alert(`❌ ${data.error ?? "Aanmaken mislukt. Probeer opnieuw."}`);
    }
    setSaving(false);
  }

  return (
    <>
      {saved && <div style={s.savedBanner}>✅ Feestje aangemaakt! Je vindt het in het Conceptrooster.</div>}
      <p className={styles.sectionTitle}>Feestje aanmaken</p>
      <form onSubmit={handleSubmit}>
        <div className={styles.card} style={{ marginBottom: 12 }}>
          <label className={styles.label}>Naam</label>
          <input className={styles.input} value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Bijv. Oud & Nieuw..." required />
          <label className={styles.label}>Datum</label>
          <input className={styles.input} type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} required />
        </div>

        <p className={styles.sectionTitle}>Diensten</p>
        {eventForm.shifts.map((shift, idx) => (
          <div key={idx} className={styles.card} style={{ marginBottom: 10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#e8e0ff", margin:0 }}>Dienst {idx + 1}</p>
              {eventForm.shifts.length > 1 && (
                <button type="button" style={{ ...s.iconBtn, color:"#ff4f6d" }} onClick={() => removeShift(idx)}>🗑</button>
              )}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {(["tapper", "bonnenkassa"] as const).map(r => (
                <div key={r} className={`${styles.chip}${shift.role === r ? ` ${styles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => updateShift(idx, "role", r)}>
                  {r === "bonnenkassa" ? "🎟 Kassa" : "🍺 Tapper"}
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <div style={{ flex:1 }}><label className={styles.label}>Start</label><input className={styles.input} style={{ marginBottom:0 }} value={shift.start_time} onChange={e => updateShift(idx, "start_time", e.target.value)} required /></div>
              <div style={{ flex:1 }}><label className={styles.label}>Eind</label><input className={styles.input} style={{ marginBottom:0 }} value={shift.end_time} onChange={e => updateShift(idx, "end_time", e.target.value)} required /></div>
            </div>
            <label className={styles.label}>Aantal tappers</label>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button type="button" style={{ ...s.iconBtn, fontSize:18 }} onClick={() => updateShift(idx, "max_tappers", Math.max(1, shift.max_tappers - 1))}>−</button>
              <span style={{ fontFamily:"monospace", fontSize:22, color:"#00e5c3", minWidth:32, textAlign:"center" }}>{shift.max_tappers}</span>
              <button type="button" style={{ ...s.iconBtn, fontSize:18 }} onClick={() => updateShift(idx, "max_tappers", Math.min(20, shift.max_tappers + 1))}>+</button>
            </div>
          </div>
        ))}

        <button type="button" className={styles.btnSecondary} style={{ marginBottom:12 }} onClick={addShift}>+ Dienst toevoegen</button>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Aanmaken..." : "✅ Feestje aanmaken"}</button>
      </form>
    </>
  );
}
