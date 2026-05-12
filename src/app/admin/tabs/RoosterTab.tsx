"use client";
import { useState } from "react";
import type { Shift } from "@/types";
import { useAdminShell } from "../AdminShellContext";
import { AdminShiftCard } from "../components/AdminShiftCard";
import { AddTapperModal } from "../components/AddTapperModal";
import styles from "@/styles/shared.module.css";

const emptyShift = () => ({ role: "tapper" as "tapper" | "bonnenkassa", start_time: "20:00", end_time: "02:00", max_tappers: 2 });

const s: Record<string, React.CSSProperties> = {
  savedBanner: { background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center" as const, marginBottom:12 },
  iconBtn: { background:"#221f38", border:"1px solid #2e2a4a", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14, color:"#e8e0ff" },
};

export function RoosterTab({ onGoToPublish }: { onGoToPublish: () => void }) {
  const { dateFrom, dateTo, setDateFrom, setDateTo, published, conceptShifts, setConceptShifts } = useAdminShell();
  const [rosterView, setRosterView] = useState<"published" | "concept">("published");
  const [generating, setGenerating] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", shifts: [emptyShift()] });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventSaved, setEventSaved] = useState(false);
  const [defaultShifts, setDefaultShifts] = useState({
    wednesday: { enabled: true, start: "19:00", end: "23:00" },
    friday:    { enabled: true, start: "20:00", end: "00:00" },
    saturday:  { enabled: true, start: "20:00", end: "00:00" },
  });

  function addShiftToEvent() { setEventForm(f => ({ ...f, shifts: [...f.shifts, emptyShift()] })); }
  function removeShiftFromEvent(idx: number) { setEventForm(f => ({ ...f, shifts: f.shifts.filter((_, i) => i !== idx) })); }
  function updateEventShift(idx: number, field: string, value: unknown) { setEventForm(f => ({ ...f, shifts: f.shifts.map((s, i) => i === idx ? { ...s, [field]: value } : s) })); }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setSavingEvent(true);
    const res = await fetch("/api/events", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(eventForm) });
    const data = await res.json();
    if (res.ok) {
      setEventSaved(true);
      setShowEventForm(false);
      setEventForm({ title:"", date:"", shifts:[emptyShift()] });
      if (data.data?.shifts) setConceptShifts(cs => [...cs, ...data.data.shifts]);
      setTimeout(() => setEventSaved(false), 3000);
    }
    setSavingEvent(false);
  }

  async function handleGenerate() {
    if (!dateFrom || !dateTo) { alert("Selecteer een van- en tot-datum."); return; }
    if (dateFrom > dateTo) { alert("De startdatum moet voor de einddatum liggen."); return; }
    setGenerating(true);
    const res = await fetch("/api/schedule", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dateFrom, dateTo, defaultShifts }) });
    const data = await res.json();
    if (data.error) { alert("❌ " + data.error); setGenerating(false); return; }
    if (data.data?.shifts) { setConceptShifts(data.data.shifts); setRosterView("concept"); }
    else alert("Geen nieuwe diensten aangemaakt.");
    setGenerating(false);
  }

  return (
    <>
      {eventSaved && <div style={s.savedBanner}>✅ Feestje aangemaakt!</div>}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {(["published", "concept"] as const).map(v => (
          <button key={v} onClick={() => setRosterView(v)} style={{ flex:1, padding:"10px", borderRadius:10, fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", background:rosterView === v ? "rgba(0,229,195,0.1)" : "#221f38", color:rosterView === v ? "#00e5c3" : "#8b80b0", borderWidth:1, borderStyle:"solid", borderColor:rosterView === v ? "#00e5c3" : "#2e2a4a" }}>
            {v === "published" ? "📋 Gepubliceerd" : "🗒 Concept"}
          </button>
        ))}
      </div>

      {rosterView === "published" && (
        <>
          <p className={styles.sectionTitle}>Gepubliceerd rooster</p>
          {published.length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen diensten</p>
            </div>
          )}
          {published.map(shift => <AdminShiftCard key={shift.id} shift={shift as any} source="published" />)}
        </>
      )}

      {rosterView === "concept" && (
        <>
          <button className={styles.btnPrimary} style={{ marginBottom:12 }} onClick={() => setShowEventForm(true)}>🎉 Feestje / evenement aanmaken</button>
          <p className={styles.sectionTitle}>Tapavonden genereren</p>
          <div className={styles.card}>
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}><label className={styles.label}>Van</label><input type="date" className={styles.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
              <div style={{ flex:1 }}><label className={styles.label}>Tot en met</label><input type="date" className={styles.input} value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            </div>
            <button className={styles.btnSecondary} onClick={handleGenerate} disabled={generating}>{generating ? "⏳ Genereren..." : "🤖 Genereer conceptrooster"}</button>
          </div>

          <p className={styles.sectionTitle}>Standaard tapavonden</p>
          <div className={styles.card}>
            {(["wednesday", "friday", "saturday"] as const).map(day => {
              const labels = { wednesday:"Woensdag", friday:"Vrijdag", saturday:"Zaterdag" };
              const cfg = defaultShifts[day];
              return (
                <div key={day} style={{ borderBottom:"1px solid #2e2a4a", paddingBottom:12, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:cfg.enabled ? 10 : 0 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:cfg.enabled ? "#e8e0ff" : "#8b80b0" }}>{labels[day]}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:"#8b80b0" }}>{cfg.enabled ? "Aan" : "Uit"}</span>
                      <div onClick={() => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], enabled: !d[day].enabled } }))} style={{ width:40, height:22, borderRadius:11, background:cfg.enabled ? "#00e5c3" : "#2e2a4a", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                        <div style={{ position:"absolute", top:3, left:cfg.enabled ? 20 : 3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.2s" }} />
                      </div>
                    </div>
                  </div>
                  {cfg.enabled && (
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1 }}><label className={styles.label} style={{ fontSize:10 }}>Start</label><input className={styles.input} style={{ marginBottom:0, padding:"8px 10px", fontSize:13 }} type="time" value={cfg.start} onChange={e => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], start: e.target.value } }))} /></div>
                      <div style={{ flex:1 }}><label className={styles.label} style={{ fontSize:10 }}>Eind</label><input className={styles.input} style={{ marginBottom:0, padding:"8px 10px", fontSize:13 }} type="time" value={cfg.end} onChange={e => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], end: e.target.value } }))} /></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {conceptShifts.length > 0 && (
            <>
              <p className={styles.sectionTitle}>Conceptrooster ({conceptShifts.length} diensten)</p>
              {conceptShifts.map(shift => <AdminShiftCard key={shift.id} shift={shift as any} source="concept" />)}
              <div className={styles.card} style={{ borderColor:"#00e5c3", marginTop:8 }}>
                <p style={{ fontSize:13, color:"#8b80b0", marginBottom:12 }}>Tevreden? Zet het rooster live via "Publiceer".</p>
                <button className={styles.btnPrimary} onClick={onGoToPublish}>🚀 Ga naar publiceren →</button>
              </div>
            </>
          )}
          {conceptShifts.length === 0 && !generating && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen diensten</p>
            </div>
          )}
        </>
      )}

      {/* Feestje modal */}
      {showEventForm && (
        <div className={styles.overlay} onClick={() => setShowEventForm(false)}>
          <div className={styles.sheet} style={{ maxHeight:"85vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <p className={styles.sheetTitle}>🎉 Feestje aanmaken</p>
            <form onSubmit={handleCreateEvent}>
              <label className={styles.label}>Naam</label>
              <input className={styles.input} value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Bijv. Oud & Nieuw..." required />
              <label className={styles.label}>Datum</label>
              <input className={styles.input} type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} required />
              <p className={styles.sectionTitle} style={{ marginTop:16 }}>Diensten</p>
              {eventForm.shifts.map((shift, idx) => (
                <div key={idx} className={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:"#e8e0ff" }}>Dienst {idx + 1}</p>
                    {eventForm.shifts.length > 1 && <button type="button" style={{ ...s.iconBtn, color:"#ff4f6d" }} onClick={() => removeShiftFromEvent(idx)}>🗑</button>}
                  </div>
                  <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                    {(["tapper", "bonnenkassa"] as const).map(r => (
                      <div key={r} className={`${styles.chip}${shift.role === r ? ` ${styles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => updateEventShift(idx, "role", r)}>
                        {r === "bonnenkassa" ? "🎟 Kassa" : "🍺 Tapper"}
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                    <div style={{ flex:1 }}><label className={styles.label}>Start</label><input className={styles.input} style={{ marginBottom:0 }} value={shift.start_time} onChange={e => updateEventShift(idx, "start_time", e.target.value)} required /></div>
                    <div style={{ flex:1 }}><label className={styles.label}>Eind</label><input className={styles.input} style={{ marginBottom:0 }} value={shift.end_time} onChange={e => updateEventShift(idx, "end_time", e.target.value)} required /></div>
                  </div>
                  <label className={styles.label}>Aantal tappers</label>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button type="button" style={{ ...s.iconBtn, fontSize:18 }} onClick={() => updateEventShift(idx, "max_tappers", Math.max(1, shift.max_tappers - 1))}>−</button>
                    <span style={{ fontFamily:"monospace", fontSize:22, color:"#00e5c3", minWidth:32, textAlign:"center" }}>{shift.max_tappers}</span>
                    <button type="button" style={{ ...s.iconBtn, fontSize:18 }} onClick={() => updateEventShift(idx, "max_tappers", Math.min(20, shift.max_tappers + 1))}>+</button>
                  </div>
                </div>
              ))}
              <button type="button" className={styles.btnSecondary} style={{ marginBottom:12 }} onClick={addShiftToEvent}>+ Dienst toevoegen</button>
              <button type="submit" className={styles.btnPrimary} disabled={savingEvent}>{savingEvent ? "Aanmaken..." : "✅ Feestje aanmaken"}</button>
              <button type="button" className={styles.btnSecondary} style={{ marginTop:8 }} onClick={() => setShowEventForm(false)}>Annuleren</button>
            </form>
          </div>
        </div>
      )}

      <AddTapperModal />
    </>
  );
}
