"use client";
import { useState } from "react";
import { useAdminShell } from "../AdminShellContext";
import { AdminShiftCard } from "../components/AdminShiftCard";
import { AddTapperModal } from "../components/AddTapperModal";
import { EventsTab } from "./EventsTab";
import { TimeSelect } from "../components/TimeSelect";
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

const CalendarIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3e3a5a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <circle cx="8" cy="15" r="0.8" fill="#3e3a5a" stroke="none"/>
    <circle cx="12" cy="15" r="0.8" fill="#3e3a5a" stroke="none"/>
    <circle cx="16" cy="15" r="0.8" fill="#3e3a5a" stroke="none"/>
  </svg>
);

const DocumentIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3e3a5a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

export function RoosterTab() {
  const { dateFrom, dateTo, setDateFrom, setDateTo, published, conceptShifts, setConceptShifts, setPublished } = useAdminShell();
  const [rosterView, setRosterView] = useState<"published" | "concept" | "events">("published");
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

  const [publishMsg, setPublishMsg] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  async function handleGenerate() {
    setGeneratorError(null);
    if (!dateFrom || !dateTo) { setGeneratorError("Selecteer een van- en tot-datum."); return; }
    if (dateFrom > dateTo) { setGeneratorError("De startdatum moet voor de einddatum liggen."); return; }
    setGenerating(true);
    const res = await fetch("/api/schedule", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dateFrom, dateTo, defaultShifts }) });
    const data = await res.json();
    if (data.error) { setGeneratorError("❌ " + data.error); setGenerating(false); return; }
    if (data.data?.shifts) {
      setConceptShifts(data.data.shifts);
    } else {
      setGeneratorError("Geen nieuwe diensten aangemaakt.");
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
      setTimeout(() => setPublishResult(null), 6000);
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
        {([
          { id: "published", label: "📋 Gepubliceerd" },
          { id: "concept",   label: "🗒 Concept" },
          { id: "events",    label: "🎉 Events" },
        ] as const).map(v => (
          <button key={v.id} onClick={() => setRosterView(v.id)} style={{ flex:1, padding:"10px", borderRadius:10, fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer", background:rosterView === v.id ? "rgba(0,229,195,0.1)" : "#221f38", color:rosterView === v.id ? "#00e5c3" : "#8b80b0", borderWidth:1, borderStyle:"solid", borderColor:rosterView === v.id ? "#00e5c3" : "#2e2a4a" }}>
            {v.label}
          </button>
        ))}
      </div>

      {rosterView === "published" && (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <button className={styles.navMonthBtn} onClick={prevPubMonth}>‹</button>
            <span style={{ fontSize:16, fontWeight:700, color:"#f0eeff", fontFamily:"'Exo 2', sans-serif" }}>
              {MONTH_NAMES_FULL[pubMonth]} {pubYear}
            </span>
            <button className={styles.navMonthBtn} onClick={nextPubMonth}>›</button>
          </div>
          {filteredPublished.length === 0 && (
            <div className={styles.fadeIn} style={{ textAlign:"center", padding:"40px 20px" }}>
              <CalendarIcon />
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:"12px 0 0" }}>Geen diensten in {MONTH_NAMES_FULL[pubMonth]}</p>
              <p style={{ fontSize:12, color:"#b8b0d4", marginTop:6, lineHeight:1.5 }}>Blader naar een andere maand of publiceer een conceptrooster.</p>
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
                  <div className={styles.bannerIn} style={{ background: publishResult.ok ? "rgba(0,229,195,0.08)" : "rgba(255,79,109,0.08)", border:`1px solid ${publishResult.ok ? "#00e5c3" : "#ff4f6d"}`, borderRadius:8, padding:"8px 12px", fontSize:13, color: publishResult.ok ? "#00e5c3" : "#ff4f6d", fontWeight:700, marginBottom:12 }}>
                    {publishResult.text}
                  </div>
                )}
                {!publishResult?.ok && (
                  <>
                    <p style={{ fontSize:14, color:"#e8e0ff", marginBottom:8, lineHeight:1.5 }}>Tevreden? Zet het rooster live.</p>
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
            <div className={styles.fadeIn} style={{ textAlign:"center", padding:"40px 20px" }}>
              <DocumentIcon />
              <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:"12px 0 0" }}>Geen conceptdiensten</p>
              <p style={{ fontSize:12, color:"#b8b0d4", marginTop:6, lineHeight:1.5 }}>Genereer hieronder een rooster of maak een feestje aan via de Events-tab.</p>
            </div>
          )}

          {/* Generator — altijd zichtbaar, vaste marginTop */}
          <div style={{ borderTop: conceptShifts.length > 0 ? "1px solid #2e2a4a" : "none", paddingTop: conceptShifts.length > 0 ? 16 : 0, marginTop:24 }}>
            <p className={styles.actionHeader}>Tapavonden genereren</p>
            <div className={styles.card} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1, minWidth:0 }}><label className={styles.label}>Van</label><input type="date" className={styles.input} min={new Date().toISOString().slice(0,10)} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
                <div style={{ flex:1, minWidth:0 }}><label className={styles.label}>Tot en met</label><input type="date" className={styles.input} min={dateFrom || new Date().toISOString().slice(0,10)} value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
              </div>
              {generatorError && (
                <div style={{ background:"rgba(255,79,109,0.1)", border:"1px solid #ff4f6d", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#ff4f6d", marginBottom:8 }}>
                  {generatorError}
                </div>
              )}
              <button className={styles.btnSecondary} onClick={handleGenerate} disabled={generating}>{generating ? "⏳ Genereren..." : "🤖 Genereer conceptrooster"}</button>
            </div>

            <p className={styles.sectionTitle}>Standaard tapavonden</p>
            <div className={styles.card}>
              {WEEK_DAYS.map(({ key: day, label }, idx) => {
                const cfg = defaultShifts[day];
                const isLast = idx === WEEK_DAYS.length - 1;
                return (
                  <div key={day} style={{ borderBottom: isLast ? "none" : "1px solid #2e2a4a", paddingBottom: isLast ? 0 : 8, marginBottom: isLast ? 0 : 8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: cfg.enabled ? 10 : 0 }}>
                      <span style={{ fontSize:13, fontWeight:700, color: cfg.enabled ? "#e8e0ff" : "#8b80b0" }}>{label}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:"#8b80b0" }}>{cfg.enabled ? "Aan" : "Uit"}</span>
                        <button
                          role="switch"
                          aria-checked={cfg.enabled}
                          onClick={() => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], enabled: !d[day].enabled } }))}
                          style={{ width:40, height:22, borderRadius:11, background: cfg.enabled ? "#00e5c3" : "#2e2a4a", cursor:"pointer", position:"relative", transition:"background 0.2s cubic-bezier(0.4,0,0.2,1)", border:"none", padding:0, flexShrink:0 }}
                        >
                          <div style={{ position:"absolute", top:3, left: cfg.enabled ? 20 : 3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.2s cubic-bezier(0.4,0,0.2,1)" }} />
                        </button>
                      </div>
                    </div>
                    {cfg.enabled && (
                      <div style={{ display:"flex", gap:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <label className={styles.label} style={{ fontSize:10 }}>Start</label>
                          <TimeSelect value={cfg.start} onChange={v => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], start: v } }))} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <label className={styles.label} style={{ fontSize:10 }}>Eind</label>
                          <TimeSelect value={cfg.end} onChange={v => setDefaultShifts(d => ({ ...d, [day]: { ...d[day], end: v } }))} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {rosterView === "events" && <EventsTab />}

      <AddTapperModal />
    </>
  );
}
