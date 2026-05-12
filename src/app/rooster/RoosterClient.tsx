"use client";
import { useState } from "react";
import { APP_CONFIG } from "@/lib/config";
import { parseLocalDate, formatDate, formatDateShort } from "@/lib/dates";

const MONTH_NAMES = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const DAY_LABELS = ["Ma","Di","Wo","Do","Vr","Za","Zo"];

// Color constants
const C = {
  myShift:   "#5a4a9e", // Paars — mijn dienst
  party:     "#3b82f6", // Blauw — feestje/evenement
  full:      "#00e5c3", // Groen — alle plaatsen gevuld
  partial:   "#ffb547", // Oranje — niet alle plaatsen gevuld
  empty:     "#ff4f6d", // Rood — nog geen plaatsen gevuld
};

function getMondayOffset(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1;
}

function getDayColor(dayShifts: any[], myShiftIds: string[]): { bg: string; color: string; borderColor: string } {
  const isMe = dayShifts.some(s => myShiftIds.includes(s.id));
  const isParty = dayShifts.every(s => s.type === "feestje");

  if (isMe) return { bg: `rgba(90,74,158,0.25)`, color: C.myShift, borderColor: C.myShift };
  if (isParty) return { bg: `rgba(59,130,246,0.12)`, color: C.party, borderColor: C.party };

  // Occupancy-based color for tapavonden
  const totalMax = dayShifts.reduce((sum, s) => sum + (s.max_tappers || 2), 0);
  const totalAssigned = dayShifts.reduce((sum, s) =>
    sum + (s.assignments || []).filter((a: any) => a.status !== "declined").length, 0);

  if (totalAssigned === 0) return { bg: `rgba(255,79,109,0.1)`, color: C.empty, borderColor: C.empty };
  if (totalAssigned >= totalMax) return { bg: `rgba(0,229,195,0.1)`, color: C.full, borderColor: C.full };
  return { bg: `rgba(255,181,71,0.1)`, color: C.partial, borderColor: C.partial };
}

export default function RoosterClient({
  shifts, myShiftIds, userId, userAssignments,
}: {
  shifts: any[]; myShiftIds: string[]; userId: string; userAssignments: any[];
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [view, setView] = useState<"cal" | "list">("cal");
  const [selectedShifts, setSelectedShifts] = useState<any[]>([]);
  const [claimModal, setClaimModal] = useState<any | null>(null);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [declinedIds, setDeclinedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

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

  // Build day map
  const dayMap: Record<number, any[]> = {};
  monthShifts.forEach(s => {
    const day = parseLocalDate(s.date).getDate();
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(s);
  });

  const isToday = (day: number) =>
    viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();

  // Check if user can claim a shift
  const canClaim = (shift: any) => {
    if (myShiftIds.includes(shift.id) || claimedIds.includes(shift.id)) return false;
    const assigned = (shift.assignments || []).filter((a: any) => a.status !== "declined").length;
    return assigned < shift.max_tappers;
  };
  const isMyShift = (shift: any) => myShiftIds.includes(shift.id) || claimedIds.includes(shift.id);

  async function handleClaim(shift: any) {
    setLoading(shift.id);
    const res = await fetch(`/api/shifts/${shift.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim" }),
    });
    if (res.ok) {
      setClaimedIds(p => [...p, shift.id]);
      setClaimModal(null);
      // Update selectedShifts to reflect new assignment
      setSelectedShifts(prev => prev.map(s => s.id === shift.id ? {
        ...s,
        assignments: [...(s.assignments || []), { user_id: userId, status: "assigned", profile: { full_name: "Jij" } }]
      } : s));
    }
    setLoading(null);
  }

  async function handleDecline(shiftId: string) {
    setLoading(shiftId);
    const res = await fetch(`/api/shifts/${shiftId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    if (res.ok) setDeclinedIds(p => [...p, shiftId]);
    setLoading(null);
  }



  return (
    <div style={s.page}>
      {/* Toggle */}
      <div style={s.toggleRow}>
        {(["cal","list"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); setSelectedShifts([]); }} style={{
            ...s.toggleBtn,
            background: view===v ? "rgba(0,229,195,0.1)" : "#221f38",
            color: view===v ? "#00e5c3" : "#8b80b0",
            borderWidth:1, borderStyle:"solid", borderColor: view===v ? "#00e5c3" : "#2e2a4a",
          }}>
            {v === "cal" ? "📅 Kalender" : "📋 Lijst"}
          </button>
        ))}
      </div>

      {/* Maand nav */}
      <div style={s.monthNav}>
        <button style={s.navArrow} onClick={prevMonth}>‹</button>
        <span style={s.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button style={s.navArrow} onClick={nextMonth}>›</button>
      </div>

      {view === "cal" ? (
        <>
          {/* Legenda */}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {[
              { color: C.myShift, bg: "rgba(90,74,158,0.2)", label: "Mijn dienst" },
              { color: C.full,    bg: "rgba(0,229,195,0.1)", label: "Vol" },
              { color: C.partial, bg: "rgba(59,130,246,0.1)", label: "Niet vol" },
              { color: C.empty,   bg: "rgba(255,79,109,0.1)", label: "Leeg" },
              { color: C.party,   bg: "rgba(59,130,246,0.12)", label: "Feestje" },
            ].map(({ color, bg, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#8b80b0" }}>
                <div style={{ width:10, height:10, borderRadius:2, background:bg, borderWidth:1, borderStyle:"solid", borderColor:color }} />
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={s.calGrid}>
            {DAY_LABELS.map(d => <div key={d} style={s.dayHeader}>{d}</div>)}
            {Array(offset).fill(null).map((_,i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_,i) => {
              const day = i + 1;
              const dayShifts = dayMap[day] || [];
              const hasShift = dayShifts.length > 0;
              const today = isToday(day);

              if (!hasShift) {
                return (
                  <div key={day} style={{ aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#8b80b0", borderRadius:8, outline: today ? "2px solid rgba(0,229,195,0.3)" : "none" }}>
                    {day}
                  </div>
                );
              }

              const { bg, color, borderColor } = getDayColor(dayShifts, myShiftIds.concat(claimedIds));
              const hasOpen = dayShifts.some(s => canClaim(s));

              return (
                <div key={day} onClick={() => setSelectedShifts(dayShifts)} style={{
                  aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:700, borderRadius:8, cursor:"pointer", position:"relative",
                  background: bg, color, borderWidth:1, borderStyle:"solid", borderColor,
                  outline: today ? "2px solid rgba(0,229,195,0.4)" : "none", outlineOffset:2,
                }}>
                  {day}
                  {hasOpen && !myShiftIds.concat(claimedIds).some(id => dayShifts.some(s => s.id === id)) && (
                    <span style={{ position:"absolute", top:1, right:2, fontSize:8, color }}>+</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedShifts.length > 0 && (
            <div style={{ marginTop:16 }}>
              {selectedShifts.map(shift => {
                const mine = isMyShift(shift);
                const declined = declinedIds.includes(shift.id);
                const claimable = canClaim(shift) && !declined;
                const assigned = (shift.assignments || []).filter((a: any) => a.status !== "declined");
                const totalSpots = shift.max_tappers;
                const filledSpots = assigned.length + (claimedIds.includes(shift.id) ? 1 : 0);
                const isParty = shift.type === "feestje";
                const accentColor = mine ? C.myShift : isParty ? C.party : filledSpots >= totalSpots ? C.full : filledSpots === 0 ? C.empty : C.partial;

                return (
                  <div key={shift.id} style={{
                    background:"#1a1730", borderRadius:16, padding:16, marginBottom:10,
                    borderWidth:1, borderStyle:"solid", borderColor: accentColor,
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <p style={{ fontSize:16, fontWeight:700, color:"#f0eeff" }}>{shift.title}</p>
                          {isParty && <span style={s.warnBadge}>Feestje</span>}
                        </div>
                        <p style={{ fontSize:13, color:"#8b80b0" }}>{formatDate(shift.date)} · {shift.start_time}–{shift.end_time}</p>
                        <p style={{ fontSize:11, color: accentColor, marginTop:2 }}>{assigned.length}/{totalSpots} tappers</p>
                        {shift.admin_note && <p style={{ fontSize:11, color:"#3b82f6", marginTop:4 }}>📌 {shift.admin_note}</p>}
                      </div>
                      <button onClick={() => setSelectedShifts([])} style={s.closeBtn}>✕</button>
                    </div>

                    {/* Tappers */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                      {assigned.map((a: any) => (
                        <div key={a.user_id} style={{
                          padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600,
                          background: a.user_id===userId ? "rgba(90,74,158,0.2)" : "#221f38",
                          color: a.user_id===userId ? C.myShift : "#e8e0ff",
                          borderWidth:1, borderStyle:"solid",
                          borderColor: a.user_id===userId ? C.myShift : "#2e2a4a",
                        }}>
                          {a.profile?.full_name?.split(" ")[0] || "?"}{a.user_id===userId ? " (jij)" : ""}
                        </div>
                      ))}
                      {Array(Math.max(0, totalSpots - assigned.length)).fill(null).map((_,i) => (
                        <div key={`open${i}`} style={{ padding:"3px 10px", borderRadius:20, fontSize:12, color:"#8b80b0", borderWidth:1, borderStyle:"dashed", borderColor:"#2e2a4a", background:"transparent" }}>
                          open
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:8 }}>
                      {claimable && !declined && (
                        <button style={{ ...s.claimBtn, flex:1, opacity: loading===shift.id ? 0.5 : 1 }} disabled={loading===shift.id} onClick={() => setClaimModal(shift)}>
                          {loading===shift.id ? "..." : "✅ Inschrijven"}
                        </button>
                      )}
                      {mine && !declined && (
                        <button style={{ ...s.declineBtn, flex:1, opacity: loading===shift.id ? 0.5 : 1 }} disabled={loading===shift.id} onClick={() => handleDecline(shift.id)}>
                          {loading===shift.id ? "..." : "🔴 Afmelden"}
                        </button>
                      )}
                      <a href={`/api/shifts/${shift.id}/ical`} style={{ ...s.icalBtn, flex: claimable || mine ? 0 : 1, textDecoration:"none" }}>📅</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* List view */
        <>
          {monthShifts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#8b80b0" }}>Geen diensten deze maand.</div>
          ) : monthShifts.map(shift => {
            const mine = isMyShift(shift);
            const isParty = shift.type === "feestje";
            const assigned = (shift.assignments || []).filter((a: any) => a.status !== "declined").length;
            const accentColor = mine ? C.myShift : isParty ? C.party : assigned >= shift.max_tappers ? C.full : assigned === 0 ? C.empty : C.partial;

            return (
              <div key={shift.id} style={{ background:"#1a1730", borderRadius:16, padding:16, marginBottom:10, borderLeft:`3px solid ${accentColor}`, borderTop:"1px solid #2e2a4a", borderRight:"1px solid #2e2a4a", borderBottom:"1px solid #2e2a4a" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                      <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{shift.title}</p>
                      {mine && <span style={s.myBadge}>Jij</span>}
                      {isParty && <span style={s.warnBadge}>Feestje</span>}
                    </div>
                    <p style={{ fontSize:12, color:"#8b80b0" }}>{formatDateShort(shift.date)}</p>
                    <p style={{ fontSize:12, color:"#8b80b0" }}>{shift.start_time}–{shift.end_time}</p>
                    <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                      {(shift.assignments || []).filter((a: any) => a.status !== "declined").map((a: any) => (
                        <span key={a.user_id} style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:a.user_id===userId?"rgba(90,74,158,0.2)":"#221f38", color:a.user_id===userId?C.myShift:"#8b80b0", borderWidth:1, borderStyle:"solid", borderColor:a.user_id===userId?C.myShift:"#2e2a4a" }}>
                          {a.profile?.full_name?.split(" ")[0] || "?"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                    <p style={{ fontSize:11, color: accentColor }}>{assigned}/{shift.max_tappers}</p>
                    <a href={`/api/shifts/${shift.id}/ical`} style={{ ...s.icalBtnSm, textDecoration:"none" }}>📅</a>
                    {canClaim(shift) && <button style={s.claimBtnSm} onClick={() => setClaimModal(shift)}>Inschrijven</button>}
                    {mine && <button style={s.declineBtnSm} onClick={() => handleDecline(shift.id)}>Afmelden</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Claim modal */}
      {claimModal && (
        <div style={s.overlay} onClick={() => setClaimModal(null)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <h3 style={s.sheetTitle}>Inschrijven</h3>
            <p style={{ fontSize:13, color:"#8b80b0", marginBottom:16 }}>Bevestig jouw aanmelding voor deze dienst.</p>
            <div style={{ background:"#221f38", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{claimModal.title}</p>
              <p style={{ fontSize:13, color:"#8b80b0", marginTop:4 }}>{formatDate(claimModal.date)} · {claimModal.start_time}–{claimModal.end_time}</p>
            </div>
            <p style={{ fontSize:12, color:"#8b80b0", marginBottom:20, lineHeight:1.5 }}>
              Je ontvangt een bevestiging per e-mail en herinneringen 2 weken en 1 week van tevoren.
            </p>
            <button style={s.btnPrimary} disabled={loading===claimModal.id} onClick={() => handleClaim(claimModal)}>
              {loading===claimModal.id ? "Bezig..." : "✅ Ja, ik schrijf me in!"}
            </button>
            <button style={{ ...s.btnSecondary, marginTop:8 }} onClick={() => setClaimModal(null)}>Annuleren</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:"16px 16px 100px" },
  toggleRow: { display:"flex", gap:8, marginBottom:16 },
  toggleBtn: { flex:1, padding:"10px", borderRadius:10, fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },
  monthNav: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  navArrow: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:8, color:"#e8e0ff", fontSize:20, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" },
  monthLabel: { fontSize:18, fontWeight:900, color:"#f0eeff", fontFamily:"'Exo 2',sans-serif" },
  calGrid: { display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:16 },
  dayHeader: { textAlign:"center", fontSize:10, fontWeight:700, color:"#8b80b0", padding:"4px 0" },
  closeBtn: { background:"none", border:"none", color:"#8b80b0", fontSize:16, cursor:"pointer", padding:4, flexShrink:0 },
  warnBadge: { background:"rgba(59,130,246,0.1)", borderWidth:1, borderStyle:"solid", borderColor:"#3b82f6", color:"#3b82f6", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 },
  myBadge: { background:"rgba(90,74,158,0.2)", borderWidth:1, borderStyle:"solid", borderColor:"#5a4a9e", color:"#5a4a9e", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 },
  claimBtn: { padding:"10px 14px", borderRadius:10, background:"linear-gradient(135deg,#00e5c3,#00b89c)", color:"#0f0d1a", border:"none", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"uppercase" },
  claimBtnSm: { padding:"5px 10px", borderRadius:8, background:"rgba(0,229,195,0.1)", borderWidth:1, borderStyle:"solid", borderColor:"#00e5c3", color:"#00e5c3", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:11, cursor:"pointer" },
  declineBtn: { padding:"10px 14px", borderRadius:10, background:"rgba(255,79,109,0.1)", borderWidth:1, borderStyle:"solid", borderColor:"#ff4f6d", color:"#ff4f6d", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"uppercase" },
  declineBtnSm: { padding:"5px 10px", borderRadius:8, background:"rgba(255,79,109,0.1)", borderWidth:1, borderStyle:"solid", borderColor:"#ff4f6d", color:"#ff4f6d", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:11, cursor:"pointer" },
  icalBtn: { padding:"10px 12px", borderRadius:10, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", cursor:"pointer", fontSize:16 },
  icalBtnSm: { padding:"5px 8px", borderRadius:8, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", fontSize:14, cursor:"pointer" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" },
  sheet: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px", width:"100%", maxWidth:430 },
  sheetHandle: { width:36, height:4, background:"#2e2a4a", borderRadius:2, margin:"0 auto 20px" },
  sheetTitle: { fontSize:18, fontWeight:700, color:"#f0eeff", marginBottom:8, fontFamily:"'Exo 2',sans-serif" },
  btnPrimary: { width:"100%", padding:14, borderRadius:12, background:"linear-gradient(135deg,#00e5c3,#00b89c)", color:"#0f0d1a", fontFamily:"'Exo 2',sans-serif", fontSize:14, fontWeight:700, border:"none", cursor:"pointer", textTransform:"uppercase", display:"block" },
  btnSecondary: { width:"100%", padding:14, borderRadius:12, background:"#221f38", color:"#e8e0ff", fontFamily:"'Exo 2',sans-serif", fontSize:15, fontWeight:700, border:"1px solid #2e2a4a", cursor:"pointer", textTransform:"uppercase", display:"block" },
};
