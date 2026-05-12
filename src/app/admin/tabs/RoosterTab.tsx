"use client";
import { useState } from "react";
import { useAdminShell } from "../AdminShellContext";
import { AdminShiftCard } from "../components/AdminShiftCard";
import { AddTapperModal } from "../components/AddTapperModal";
import styles from "@/styles/shared.module.css";

const s: Record<string, React.CSSProperties> = {
  chevronBtn: { background:"none", border:"none", cursor:"pointer", color:"#8b80b0", padding:"4px 8px", display:"flex", alignItems:"center", gap:6, fontFamily:"'Exo 2', sans-serif", fontWeight:700, fontSize:13 } as React.CSSProperties,
};

export function RoosterTab({ onGoToPublish }: { onGoToPublish: () => void }) {
  const { dateFrom, dateTo, setDateFrom, setDateTo, published, conceptShifts, setConceptShifts } = useAdminShell();
  const [rosterView, setRosterView] = useState<"published" | "concept">("published");
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(conceptShifts.length === 0);
  const [defaultShifts, setDefaultShifts] = useState({
    wednesday: { enabled: true, start: "19:00", end: "23:00" },
    friday:    { enabled: true, start: "20:00", end: "00:00" },
    saturday:  { enabled: true, start: "20:00", end: "00:00" },
  });

  async function handleGenerate() {
    if (!dateFrom || !dateTo) { alert("Selecteer een van- en tot-datum."); return; }
    if (dateFrom > dateTo) { alert("De startdatum moet voor de einddatum liggen."); return; }
    setGenerating(true);
    const res = await fetch("/api/schedule", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dateFrom, dateTo, defaultShifts }) });
    const data = await res.json();
    if (data.error) { alert("❌ " + data.error); setGenerating(false); return; }
    if (data.data?.shifts) {
      setConceptShifts(data.data.shifts);
      setShowGenerator(false);
    } else {
      alert("Geen nieuwe diensten aangemaakt.");
    }
    setGenerating(false);
  }

  return (
    <>
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
          {/* 1. Concept shifts lijst bovenaan */}
          {conceptShifts.length > 0 && (
            <>
              <p className={styles.sectionTitle}>Conceptrooster ({conceptShifts.length} diensten)</p>
              {conceptShifts.map(shift => <AdminShiftCard key={shift.id} shift={shift as any} source="concept" />)}
              <div className={styles.card} style={{ borderColor:"#00e5c3", marginTop:8, marginBottom:16 }}>
                <p style={{ fontSize:13, color:"#8b80b0", marginBottom:12 }}>Tevreden? Zet het rooster live via "Publiceer".</p>
                <button className={styles.btnPrimary} onClick={onGoToPublish}>🚀 Ga naar publiceren →</button>
              </div>
            </>
          )}
          {conceptShifts.length === 0 && !generating && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen conceptdiensten</p>
              <p style={{ fontSize:12, color:"#8b80b0", marginTop:4 }}>Genereer een rooster of maak een feestje aan via de Events-tab.</p>
            </div>
          )}

          {/* 2. Inklapbare generator sectie onderaan */}
          <div style={{ borderTop:"1px solid #2e2a4a", paddingTop:12, marginTop:4 }}>
            <button style={s.chevronBtn} onClick={() => setShowGenerator(v => !v)}>
              <span style={{ transition:"transform 0.2s", display:"inline-block", transform:showGenerator ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
              Tapavonden genereren
            </button>
            {showGenerator && (
              <>
                <div className={styles.card} style={{ marginTop:10 }}>
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
              </>
            )}
          </div>
        </>
      )}

      <AddTapperModal />
    </>
  );
}
