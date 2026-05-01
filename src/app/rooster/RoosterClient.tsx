"use client";
import { useState } from "react";

const MONTH_NAMES = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const DAY_LABELS = ["Ma","Di","Wo","Do","Vr","Za","Zo"];

// Timezone-safe date parser — vermijdt UTC offset bug
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Timezone-safe dag van de week (0=zo,1=ma,...,6=za)
function getLocalDay(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

// Geeft het correct maandag-first offset (0=ma, 6=zo)
function getMondayOffset(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay(); // 0=zo, 1=ma,...
  return firstDay === 0 ? 6 : firstDay - 1;
}

export default function RoosterClient({ shifts, myShiftIds, userId }: { shifts: any[]; myShiftIds: string[]; userId: string; }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [view, setView] = useState<"cal" | "list">("cal");
  const [selectedShifts, setSelectedShifts] = useState<any[]>([]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset = getMondayOffset(viewYear, viewMonth);

  const monthShifts = shifts.filter(s => {
    const d = parseLocalDate(s.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  // Map dag (1-31) -> shifts — gebruik lokale datum parsing
  const dayMap: Record<number, any[]> = {};
  monthShifts.forEach(s => {
    const day = parseLocalDate(s.date).getDate();
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(s);
  });

  function handleDayClick(dayShifts: any[]) {
    setSelectedShifts(dayShifts);
  }

  function handleIcal(shift: any) {
    const d = parseLocalDate(shift.date);
    const fmt = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${d.getFullYear()}${fmt(d.getMonth()+1)}${fmt(d.getDate())}`;
    const icsContent = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OJC Walhalla//Taprooster//NL",
      "BEGIN:VEVENT",
      `UID:shift-${shift.id}@ojcwalhalla.nl`,
      `DTSTART:${dateStr}T${shift.start_time.replace(":","") }00`,
      `DTEND:${dateStr}T${shift.end_time.replace(":","") }00`,
      `SUMMARY:🍺 ${shift.title}`,
      "LOCATION:De Donckstraat 24/26\\, 5975 AC Sevenum",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `walhalla-${shift.date}.ics`; a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(d: string) {
    return parseLocalDate(d).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  }

  const todayDay = now.getDate();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div style={s.page}>
      {/* Toggle */}
      <div style={s.toggleRow}>
        {(["cal","list"] as const).map(v => (
          <button key={v} style={{ ...s.toggleBtn, background: view===v?"rgba(0,229,195,0.1)":"#221f38", color: view===v?"#00e5c3":"#8b80b0", border:`1px solid ${view===v?"#00e5c3":"#2e2a4a"}` }} onClick={() => { setView(v); setSelectedShifts([]); }}>
            {v === "cal" ? "📅 Kalender" : "📋 Lijst"}
          </button>
        ))}
      </div>

      {/* Maand navigatie */}
      <div style={s.monthNav}>
        <button style={s.navArrow} onClick={prevMonth}>‹</button>
        <span style={s.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button style={s.navArrow} onClick={nextMonth}>›</button>
      </div>

      {view === "cal" ? (
        <>
          {/* Legenda */}
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <span style={s.legendItem}><span style={{ ...s.dot, background:"#00e5c3" }} />Mijn dienst</span>
            <span style={s.legendItem}><span style={{ ...s.dot, background:"#ffb547" }} />Feestje</span>
            <span style={s.legendItem}><span style={{ ...s.dot, background:"#5a4a9e" }} />Andere tapper</span>
            <span style={s.legendItem}><span style={{ ...s.dot, background:"#2e2a4a" }} />Open</span>
          </div>

          {/* Kalender grid */}
          <div style={s.calGrid}>
            {DAY_LABELS.map(d => <div key={d} style={s.dayHeader}>{d}</div>)}
            {Array(offset).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const dayShifts = dayMap[day] || [];
              const hasMyShift = dayShifts.some(s => myShiftIds.includes(s.id));
              const hasParty = dayShifts.some(s => s.type === "feestje");
              const hasShift = dayShifts.length > 0;
              const isOpen = hasShift && !hasMyShift && dayShifts.some(s => {
                const assigned = (s.assignments || []).filter((a: any) => a.status !== "declined").length;
                return assigned < s.max_tappers;
              });
              const isToday = isCurrentMonth && day === todayDay;

              let bg = "transparent", color = "#8b80b0", border = "none";
              if (hasMyShift) { bg = "rgba(0,229,195,0.12)"; color = "#00e5c3"; border = "1px solid #00e5c3"; }
              else if (hasParty) { bg = "rgba(255,181,71,0.1)"; color = "#ffb547"; border = "1px solid #ffb547"; }
              else if (hasShift) { bg = "#221f38"; color = "#e8e0ff"; border = "1px solid #2e2a4a"; }

              return (
                <div key={day} style={{ aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8, fontSize:13, fontWeight:hasShift?700:400, background:bg, color, border, cursor:hasShift?"pointer":"default", position:"relative", outline:isToday?"2px solid rgba(0,229,195,0.5)":"none", outlineOffset:2 }}
                  onClick={() => hasShift && handleDayClick(dayShifts)}>
                  {day}
                  {isToday && <span style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"#00e5c3" }} />}
                  {isOpen && <span style={{ position:"absolute", top:2, right:2, width:5, height:5, borderRadius:"50%", background:"#ffb547" }} />}
                </div>
              );
            })}
          </div>

          {/* Geselecteerde dag detail */}
          {selectedShifts.length > 0 && (
            <div style={{ marginTop:16 }}>
              {selectedShifts.map(shift => {
                const isMe = myShiftIds.includes(shift.id);
                const assigned = (shift.assignments || []).filter((a: any) => a.status !== "declined").length;
                return (
                  <div key={shift.id} style={{ ...s.card, border:`1px solid ${isMe?"#00e5c3":shift.type==="feestje"?"#ffb547":"#2e2a4a"}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div>
                        <p style={{ fontSize:16, fontWeight:700, color:"#f0eeff" }}>{shift.title}</p>
                        <p style={{ fontSize:13, color:"#8b80b0", marginTop:2 }}>{formatDate(shift.date)} · {shift.start_time}–{shift.end_time}</p>
                        <p style={{ fontSize:11, color:"#8b80b0", marginTop:2 }}>{assigned}/{shift.max_tappers} tappers</p>
                      </div>
                      <button onClick={() => setSelectedShifts([])} style={s.closeBtn}>✕</button>
                    </div>
                    {/* Tappers */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                      {(shift.assignments || []).filter((a: any) => a.status !== "declined").map((a: any) => (
                        <div key={a.user_id} style={{ ...s.avatarChip, background:a.user_id===userId?"rgba(0,229,195,0.1)":"#221f38", border:`1px solid ${a.user_id===userId?"#00e5c3":"#2e2a4a"}`, color:a.user_id===userId?"#00e5c3":"#e8e0ff" }}>
                          {a.profile?.full_name?.split(" ").map((n: string) => n[0]).join("")||"?"} {a.user_id===userId&&"(jij)"}
                        </div>
                      ))}
                      {assigned === 0 && <span style={{ fontSize:12, color:"#8b80b0" }}>Nog niemand ingeschreven</span>}
                    </div>
                    <button style={s.icalBtn} onClick={() => handleIcal(shift)}>📅 Toevoegen aan agenda</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Lijst view */
        <>
          {monthShifts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#8b80b0" }}>Geen diensten deze maand.</div>
          ) : monthShifts.map(shift => {
            const isMe = myShiftIds.includes(shift.id);
            const assigned = (shift.assignments || []).filter((a: any) => a.status !== "declined").length;
            return (
              <div key={shift.id} style={{ ...s.card, borderLeft:`3px solid ${isMe?"#00e5c3":shift.type==="feestje"?"#ffb547":"#2e2a4a"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                      <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{shift.title}</p>
                      {isMe && <span style={s.badgeMint}>Jij</span>}
                      {shift.type==="feestje" && <span style={s.badgeWarn}>Feestje</span>}
                    </div>
                    <p style={{ fontSize:12, color:"#8b80b0" }}>{formatDate(shift.date)}</p>
                    <p style={{ fontSize:12, color:"#8b80b0" }}>{shift.start_time}–{shift.end_time}</p>
                    {shift.admin_note && <p style={{ fontSize:11, color:"#ffb547", marginTop:4 }}>📌 {shift.admin_note}</p>}
                    {/* Tappers */}
                    <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                      {(shift.assignments || []).filter((a: any) => a.status !== "declined").map((a: any) => (
                        <span key={a.user_id} style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:a.user_id===userId?"rgba(0,229,195,0.1)":"#221f38", color:a.user_id===userId?"#00e5c3":"#8b80b0", border:`1px solid ${a.user_id===userId?"#00e5c3":"#2e2a4a"}` }}>
                          {a.profile?.full_name?.split(" ")[0]||"?"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:11, color:"#8b80b0", marginBottom:6 }}>{assigned}/{shift.max_tappers}</p>
                    <button style={s.icalBtnSm} onClick={() => handleIcal(shift)}>📅</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:"16px 16px 100px" },
  toggleRow: { display:"flex", gap:8, marginBottom:16 },
  toggleBtn: { flex:1, padding:"10px", borderRadius:10, fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, letterSpacing:0.5, cursor:"pointer" },
  monthNav: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  navArrow: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:8, color:"#e8e0ff", fontSize:20, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" },
  monthLabel: { fontSize:18, fontWeight:900, color:"#f0eeff", fontFamily:"'Exo 2',sans-serif" },
  legendItem: { display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#8b80b0" },
  dot: { width:8, height:8, borderRadius:"50%", display:"inline-block" },
  calGrid: { display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:16 },
  dayHeader: { textAlign:"center", fontSize:10, fontWeight:700, color:"#8b80b0", padding:"4px 0", letterSpacing:0.5 },
  card: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, marginBottom:10 },
  closeBtn: { background:"none", border:"none", color:"#8b80b0", fontSize:16, cursor:"pointer", padding:4 },
  avatarChip: { padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:700 },
  icalBtn: { width:"100%", padding:"10px", borderRadius:10, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },
  icalBtnSm: { padding:"6px 10px", borderRadius:8, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", fontSize:14, cursor:"pointer" },
  badgeMint: { background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 },
  badgeWarn: { background:"rgba(255,181,71,0.1)", border:"1px solid #ffb547", color:"#ffb547", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 },
};
