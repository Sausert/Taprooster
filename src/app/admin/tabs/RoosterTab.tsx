"use client";
import { useState } from "react";
import { useAdminShell } from "../AdminShellContext";
import { AdminShiftCard } from "../components/AdminShiftCard";
import { AddTapperModal } from "../components/AddTapperModal";
import { parseLocalDate } from "@/lib/dates";
import styles from "@/styles/shared.module.css";

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type DayConfig = { enabled: boolean; start: string; end: string };

const WEEK_DAYS: { key: DayKey; label: string }[] = [
  { key: "monday",    label: "Maandag" },
  { key: "tuesday",   label: "Dinsdag" },
  { key: "wednesday", label: "Woensdag" },
  { key: "thursday",  label: "Donderdag" },
  { key: "friday",    label: "Vrijdag" },
  { key: "saturday",  label: "Zaterdag" },
  { key: "sunday",    label: "Zondag" },
];

const MONTH_NAMES_FULL = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

const s: Record<string, React.CSSProperties> = {
  monthNavBtn: { background:"#221f38", border:"1px solid #2e2a4a", borderRadius:8, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:22, color:"#b8b0d4", fontWeight:700, lineHeight:1 },
};

export function RoosterTab() {
  const { dateFrom, dateTo, setDateFrom, setDateTo, published, conceptShifts, setConceptShifts, setPublished } = useAdminShell();
  const [rosterView, setRosterView] = useState<"published" | "concept">("published");
  const [generating, setGenerating] = useState(false);
  const [defaultShifts, setDefaultShifts] = useState<Record<DayKey, DayConfig>>({
    monday:    { enabled: false, start: "19:00", end: "23:00" },
    tuesday:   { enabled: false, start: "19:00", end: "23:00" },
    wednesday: { enabled: true,  start: "19:00", end: "23:00" },
    thursday:  { enabled: false, start: "19:00", end: "23:00" },
    friday:    { enabled: true,  start: "20:00", end: "00:00" },
    saturday:  { enabled: true,  start: "20:00", end: "00:00" },
    sunday:    { enabled: false, start: "20:00", end: "00:00" },
  });

  // Published month navigation
  const now = new Date();
  const [pubMonth, setPubMonth] = useState(now.getMonth());
  const [pubYear, setPubYear] = useState(now.getFullYear());

  const filteredPublished = published.filter(shift => {
    try {
      const d = parseLocalDate((shift as any).date);
      return d.getMonth() === pubMonth && d.getFullYear() === pubYear;
    } catch { return false; }
  });

  function prevPubMonth() {
    if (pubMonth === 0) { setPubMonth(11); setPubYear(y => y - 1); }
    else setPubMonth(m => m - 1);
  }
  function nextPubMonth() {
    if (pubMonth === 11) { setPubMonth(0); setPubYear(y => y + 1); }
    else setPubMonth(m => m + 1);
  }

  // Inline publish state
  const [publishMsg, setPublishMsg] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleGenerate() {
    if (!dateFrom || !dateTo) { alert("Selecteer een van- en tot-datum."); return; }
    if (dateFrom > dateTo) { alert("De startdatum moet voor de einddatum liggen."); return; }
    setGenerating(true);
    const res = await fetch("/api/schedule", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dateFrom, dateTo, defaultShifts }) });
    const data = await res.json();
    if (data.error) { alert("❌ " + data.error); setGenerating(false); return; }
    if (data.data?.shifts) {
      setConceptShifts(data.data.shifts);
    } else {
      alert("Geen nieuwe diensten aangemaakt.");
    }
    setGenerating(false);
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishResult(null);
    const res = await fetch("/api/schedule/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateFrom, dateTo, message: publishMsg || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      const notified = data.data?.notified || 0;
      setPublishResult({ ok: true, text: `🚀 Rooster gepubliceerd! ${notified} tapper${notified !== 1 ? "s" : ""} genotificeerd.` });
      setPublished(ps => [...ps, ...conceptShifts.map(s => ({ ...s, status: "published" as const }))]);
      setConceptShifts([]);
      setPublishMsg("");
    } else {
      setPublishResult({ ok: false, text: `❌ Publiceren mislukt: ${data.error ?? "Probeer opnieuw."}` });
    }
    setPublishing(false);
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
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <button style={s.monthNavBtn} onClick={prevPubMonth}>‹</button>
            <span style={{ fontSize:15, fontWeight:700, color:"#f0eeff", fontFamily:"'Exo 2', sans-serif" }}>
              {MONTH_NAMES_FULL[pubMonth]} {pubYear}
            </span>
            <button style={s.monthNavBtn} onClick={nextPubMonth}>›</button>
          </div>
          <p className={styles.sectionTitle}>Gepubliceerd rooster</p>
          {filteredPublished.length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📅</div>
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen diensten in {MONTH_NAMES_FULL[pubMonth]}</p>
              <p style={{ fontSize:12, color:"#8b80b0", marginTop:4 }}>Blader naar een andere maand of publiceer een conceptrooster.</p>
            </div>
          )}
          {filteredPublished.map(shift => <AdminShiftCard key={shift.id} shift={shift as any} source="published" />)}
        </>
      )}

      {rosterView === "concept" && (
        <>
          {conceptShifts.length > 0 && (
            <>
              <p className={styles.sectionTitle}>Conceptrooster ({conceptShifts.length} diensten)</p>
              {conceptShifts.map(shift => <AdminShiftCard key={shift.id} shift={shift as any} source="concept" />)}

              <div className={styles.card} style={{ borderColor:"#00e5c3", marginTop:8, marginBottom:16 }}>
                {publishResult && (
                  <div style={{ background: publishResult.ok ? "rgba(0,229,195,0.08)" : "rgba(255,79,109,0.08)", border:`1px solid ${publishResult.ok ? "#00e5c3" : "#ff4f6d"}`, borderRadius:8, padding:"8px 12px", fontSize:13, color: publishResult.ok ? "#00e5c3" : "#ff4f6d", fontWeight:700, marginBottom:12 }}>
                    {publishResult.text}
                  </div>
                )}
                {!publishResult?.ok && (
                  <>
                    <p style={{ fontSize:13, color:"#8b80b0", marginBottom:8 }}>Tevreden? Zet het rooster live.</p>
                    {(() => {
                      const allAssigned = conceptShifts.flatMap((s: any) => (s.assignments || [])).filter((a: any) => a.status !== "declined");
                      const uniqueTapperCount = new Set(allAssigned.map((a: any) => a.user_id)).size;
                      return uniqueTapperCount > 0 ? (
                        <p style={{ fontSize:12, color:"#ffb547", marginBottom:8 }}>📬 {uniqueTapperCount} tapper{uniqueTapperCount !== 1 ? "s" : ""} {uniqueTapperCount !== 1 ? "ontvangen" : "ontvangt"} een e-mailnotificatie.</p>
                      ) : null;
                    })()}
                    <label className={styles.label}>Optioneel bericht aan tappers</label>
                    <textarea
                      className={styles.input}
                      rows={2}
                      value={publishMsg}
                      onChange={e => setPublishMsg(e.target.value)}
                      placeholder="Bijv. Let op de nieuwe tijden..."
                      style={{ resize:"none", marginBottom:10 }}
                    />
                    <button className={styles.btnPrimary} onClick={handlePublish} disabled={publishing}>
                      {publishing ? "⏳ Publiceren..." : "🚀 Rooster publiceren"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {conceptShifts.length === 0 && !generating && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🗒</div>
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen conceptdiensten</p>
              <p style={{ fontSize:12, color:"#8b80b0", marginTop:4 }}>Genereer hieronder een rooster of maak een feestje aan via de Events-tab.</p>
            </div>
          )}

          {/* Generator — altijd zichtbaar */}
          <div style={{ borderTop: conceptShifts.length > 0 ? "1px solid #2e2a4a" : "none", paddingTop: conceptShifts.length > 0 ? 16 : 0, marginTop: conceptShifts.length > 0 ? 8 : 0 }}>
            <p className={styles.sectionTitle}>Tapavonden genereren</p>
            <div className={styles.card} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1, minWidth:0 }}><label className={styles.label}>Van</label><input type="date" className={styles.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
                <div style={{ flex:1, minWidth:0 }}><label className={styles.label}>Tot en met</label><input type="date" className={styles.input} value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
              </div>
              <button className={styles.btnSecondary} onClick={handleGenerate} disabled={generating}>{generating ? "⏳ Genereren..." : "🤖 Genereer conceptrooster"}</button>
            </div>

            <p className={styles.sectionTitle}>Standaard tapavonden</p>
            <div className={styles.card}>
              {WEEK_DAYS.map(({ key: day, label }, idx) => {
                const cfg = defaultShifts[day];
                const isLast = idx === WEEK_DAYS.length - 1;
                return (
                  <div key={day} style={{ borderBottom: isLast ? "none" : "1px solid #2e2a4a", paddingBottom: isLast ? 0 : 12, marginBottom: isLast ? 0 : 12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: cfg.enabled ? 10 : 0 }}>
                      <span style={{ fontSize:13, fontWeight:700, color: cfg.enabled ? "#e8e0ff" : "#8b80b0" }}>{label}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:"#8b80b0" }}>{cfg.enabled ? "Aan" : "Uit"}</span>
                        <div onClick={() => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], enabled: !d[day].enabled } }))} style={{ width:40, height:22, borderRadius:11, background: cfg.enabled ? "#00e5c3" : "#2e2a4a", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                          <div style={{ position:"absolute", top:3, left: cfg.enabled ? 20 : 3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.2s" }} />
                        </div>
                      </div>
                    </div>
                    {cfg.enabled && (
                      <div style={{ display:"flex", gap:8 }}>
                        <div style={{ flex:1, minWidth:0 }}><label className={styles.label} style={{ fontSize:10 }}>Start</label><input className={styles.input} style={{ marginBottom:0, padding:"8px 10px", fontSize:13 }} type="time" value={cfg.start} onChange={e => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], start: e.target.value } }))} /></div>
                        <div style={{ flex:1, minWidth:0 }}><label className={styles.label} style={{ fontSize:10 }}>Eind</label><input className={styles.input} style={{ marginBottom:0, padding:"8px 10px", fontSize:13 }} type="time" value={cfg.end} onChange={e => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], end: e.target.value } }))} /></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <AddTapperModal />
    </>
  );
}
