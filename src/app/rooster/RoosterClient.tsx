"use client";
import { useState, useEffect } from "react";
import { parseLocalDate, formatDate, formatDateShort, formatTime } from "@/lib/dates";
import { useShiftApi } from "@/hooks/useShiftApi";
import { createClient } from "@/lib/supabase";
import sharedStyles from "@/styles/shared.module.css";

const MONTH_NAMES = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const DAY_LABELS = ["Ma","Di","Wo","Do","Vr","Za","Zo"];

// Color constants
const C = {
  myShift:   "#c4b5fd", // Lavender — mijn dienst
  party:     "#f472b6", // Pink — feestje/evenement
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

  if (isMe) return { bg: `rgba(90,74,158,0.45)`, color: C.myShift, borderColor: "#9b87f0" };
  if (isParty) return { bg: `rgba(244,114,182,0.12)`, color: C.party, borderColor: C.party };

  // Occupancy-based color for tapavonden
  const totalMax = dayShifts.reduce((sum, s) => sum + (s.max_tappers || 2), 0);
  const totalAssigned = dayShifts.reduce((sum, s) =>
    sum + (s.assignments || []).filter((a: any) => a.status !== "declined").length, 0);

  if (totalAssigned === 0) return { bg: `rgba(255,79,109,0.1)`, color: C.empty, borderColor: C.empty };
  if (totalAssigned >= totalMax) return { bg: `rgba(0,229,195,0.1)`, color: C.full, borderColor: C.full };
  return { bg: `rgba(255,181,71,0.1)`, color: C.partial, borderColor: C.partial };
}

export default function RoosterClient({
  shifts, myShiftIds, userId, userAssignments, isAdmin,
}: {
  shifts: any[]; myShiftIds: string[]; userId: string; userAssignments: any[]; isAdmin?: boolean;
}) {
  const [liveShifts, setLiveShifts] = useState<any[]>(shifts);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [view, setView] = useState<"cal" | "list">("cal");
  const [selectedShifts, setSelectedShifts] = useState<any[]>([]);
  const [claimModal, setClaimModal] = useState<any | null>(null);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [declinedIds, setDeclinedIds] = useState<string[]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const { loading, shiftAction } = useShiftApi();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rooster-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_assignments" }, (payload) => {
        setLiveShifts(prev => prev.map(s => {
          if (payload.eventType === "INSERT" && s.id === payload.new.shift_id) {
            const exists = (s.assignments || []).some((a: any) => a.user_id === payload.new.user_id);
            if (exists) return s;
            return { ...s, assignments: [...(s.assignments || []), payload.new] };
          }
          if (payload.eventType === "UPDATE" && s.id === payload.new.shift_id) {
            return { ...s, assignments: (s.assignments || []).map((a: any) => a.user_id === payload.new.user_id ? { ...a, status: payload.new.status } : a) };
          }
          if (payload.eventType === "DELETE" && s.id === payload.old.shift_id) {
            return { ...s, assignments: (s.assignments || []).filter((a: any) => a.user_id !== payload.old.user_id) };
          }
          return s;
        }));
        // Sync selectedShifts
        setSelectedShifts(prev => {
          if (payload.eventType === "INSERT" && prev.some(s => s.id === payload.new.shift_id)) {
            return prev.map(s => {
              if (s.id !== payload.new.shift_id) return s;
              const exists = (s.assignments || []).some((a: any) => a.user_id === payload.new.user_id);
              if (exists) return s;
              return { ...s, assignments: [...(s.assignments || []), payload.new] };
            });
          }
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!showMonthPicker) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowMonthPicker(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showMonthPicker]);

  function prevMonth() {
    setSelectedShifts([]);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedShifts([]);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset = getMondayOffset(viewYear, viewMonth);

  const monthShifts = liveShifts.filter(s => {
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
    if (myShiftIds.includes(shift.id) || claimedIds.includes(shift.id) || declinedIds.includes(shift.id)) return false;
    const assigned = (shift.assignments || []).filter((a: any) => a.status !== "declined").length;
    return assigned < shift.max_tappers;
  };
  const isMyShift = (shift: any) => myShiftIds.includes(shift.id) || claimedIds.includes(shift.id);

  async function handleClaim(shift: any) {
    const ok = await shiftAction(shift.id, "claim");
    if (ok) {
      setClaimedIds(p => [...p, shift.id]);
      setClaimModal(null);
      setSelectedShifts(prev => prev.map(s => s.id === shift.id ? {
        ...s,
        assignments: [...(s.assignments || []), { user_id: userId, status: "assigned", profile: { full_name: "Jij" } }]
      } : s));
    }
  }

  async function handleDecline(shiftId: string) {
    const ok = await shiftAction(shiftId, "decline");
    if (ok) setDeclinedIds(p => [...p, shiftId]);
  }



  return (
    <div style={s.page}>
      {/* Toggle */}
      <div style={s.toggleRow}>
        {([
          { id: "cal", label: "Kalender", icon: <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          { id: "list", label: "Lijst", icon: <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
        ] as const).map(v => (
          <button key={v.id} onClick={() => { setView(v.id); setSelectedShifts([]); }} style={{
            ...s.toggleBtn,
            background: view===v.id ? "rgba(0,229,195,0.1)" : "#221f38",
            color: view===v.id ? "#00e5c3" : "#a89ec8",
            borderWidth:1, borderStyle:"solid", borderColor: view===v.id ? "#00e5c3" : "#2e2a4a",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            {v.icon}{v.label}
          </button>
        ))}
      </div>

      {/* Maand nav */}
      <div style={s.monthNav}>
        <button style={s.navArrow} onClick={prevMonth}>‹</button>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={s.monthLabel} onClick={() => setShowMonthPicker(p => !p)}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            {(viewYear !== now.getFullYear() || viewMonth !== now.getMonth()) && (
              <button
                style={{ fontSize:11, padding:"4px 10px", borderRadius:20, background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", color:"#00e5c3", cursor:"pointer" }}
                onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); setShowMonthPicker(false); }}
              >
                Vandaag
              </button>
            )}
          </div>
          {showMonthPicker && (
            <>
              <div style={{ position:"fixed", inset:0, zIndex:99 }} onClick={() => setShowMonthPicker(false)} />
              <div role="dialog" aria-modal="true" aria-label="Maand selecteren" style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:12, padding:12, zIndex:100, width:240 }}>
              {[now.getFullYear(), now.getFullYear() + 1].map(year => (
                <div key={year}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#a89ec8", textTransform:"uppercase", letterSpacing:1, marginBottom:6, marginTop: year === now.getFullYear() ? 0 : 10 }}>{year}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:4 }}>
                    {MONTH_NAMES.map((name, idx) => {
                      const isActive = viewYear === year && viewMonth === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => { setViewYear(year); setViewMonth(idx); setShowMonthPicker(false); }}
                          style={{ padding:"5px 4px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", background: isActive ? "rgba(0,229,195,0.15)" : "transparent", color: isActive ? "#00e5c3" : "#e8e0ff", border: isActive ? "1px solid #00e5c3" : "1px solid transparent" }}
                        >
                          {name.slice(0,3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
        <button style={s.navArrow} onClick={nextMonth}>›</button>
      </div>

      {view === "cal" ? (
        <>
          {/* Legenda */}
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            {[
              { color: C.myShift, bg: "rgba(90,74,158,0.45)", label: "Mijn dienst" },
              { color: C.full,    bg: "rgba(0,229,195,0.1)", label: "Vol" },
              { color: C.partial, bg: "rgba(255,181,71,0.1)", label: "Niet vol" },
              { color: C.empty,   bg: "rgba(255,79,109,0.1)", label: "Leeg" },
              { color: C.party,   bg: "rgba(244,114,182,0.12)", label: "Feestje" },
            ].map(({ color, bg, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#a89ec8", padding:"3px 8px", background:"rgba(255,255,255,0.04)", borderRadius:6 }}>
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
                  <div key={day} style={{ aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#a89ec8", borderRadius:8, outline: today ? "2px solid rgba(0,229,195,0.3)" : "none", position:"relative" }}>
                    {day}
                    {isAdmin && <span style={{ position:"absolute", bottom:1, right:2, fontSize:9, color:"rgba(0,229,195,0.4)" }}>+</span>}
                  </div>
                );
              }

              const { bg, color, borderColor } = getDayColor(dayShifts, myShiftIds.concat(claimedIds));
              const hasOpen = dayShifts.some(s => canClaim(s));
              const isMineDay = myShiftIds.concat(claimedIds).some(id => dayShifts.some((s: any) => s.id === id));

              return (
                <div key={day} className={sharedStyles.calDay} onClick={() => setSelectedShifts(dayShifts)} style={{
                  aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:700, borderRadius:8, cursor:"pointer", position:"relative",
                  background: bg, color, borderWidth:1, borderStyle:"solid", borderColor,
                  outline: today ? "2px solid rgba(0,229,195,0.4)" : "none", outlineOffset:2,
                  boxShadow: isMineDay ? "0 0 0 2px #9b87f0, 0 0 10px rgba(155,135,240,0.35)" : undefined,
                }}>
                  {day}
                  {isMineDay && <span style={{ position:"absolute", top:1, left:2, fontSize:9, color:"#c4b5fd", lineHeight:1 }}>★</span>}
                  {dayShifts.length > 1 && (
                    <span style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:16, height:3, borderRadius:2, background:color, opacity:0.8, display:"block" }} />
                  )}
                  {dayShifts.length === 1 && hasOpen && !isMineDay && (
                    <span style={{ position:"absolute", top:1, right:2, fontSize:8, color }}>+</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedShifts.length > 0 && (
            <div className={sharedStyles.fadeIn} style={{ marginTop:16 }}>
              {selectedShifts.map(shift => {
                const mine = isMyShift(shift);
                const declined = declinedIds.includes(shift.id);
                const claimable = canClaim(shift) && !declined;
                const assigned = (shift.assignments || []).filter((a: any) => a.status !== "declined");
                const totalSpots = shift.max_tappers;
                const alreadyAssigned = assigned.some((a: any) => a.user_id === userId);
                const filledSpots = assigned.length + (claimedIds.includes(shift.id) && !alreadyAssigned ? 1 : 0);
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
                        <p style={{ fontSize:13, color:"#a89ec8" }}>{formatDate(shift.date)} · {formatTime(shift.start_time)}–{formatTime(shift.end_time)}</p>
                        <p style={{ fontSize:11, color: accentColor, marginTop:2 }}>{assigned.length}/{totalSpots} tappers</p>
                        {shift.admin_note && <p style={{ fontSize:11, color:"#a89ec8", marginTop:4 }}>{shift.admin_note}</p>}
                      </div>
                      <button onClick={() => setSelectedShifts([])} style={s.closeBtn} aria-label="Sluiten">✕</button>
                    </div>

                    {/* Tappers */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                      {assigned.map((a: any) => (
                        <div key={a.user_id} style={{
                          padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600,
                          background: a.user_id===userId ? "rgba(90,74,158,0.35)" : "#221f38",
                          color: a.user_id===userId ? C.myShift : "#e8e0ff",
                          borderWidth:1, borderStyle:"solid",
                          borderColor: a.user_id===userId ? "#9b87f0" : "#2e2a4a",
                        }}>
                          {a.profile?.full_name?.split(" ")[0] || "?"}{a.user_id===userId ? " (jij)" : ""}
                        </div>
                      ))}
                      {Array(Math.max(0, totalSpots - assigned.length)).fill(null).map((_,i) => (
                        <div key={`open${i}`} style={{ padding:"3px 10px", borderRadius:20, fontSize:12, color:"#a89ec8", borderWidth:1, borderStyle:"dashed", borderColor:"#2e2a4a", background:"transparent" }}>
                          open
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:8 }}>
                      {claimable && !declined && (
                        <button className={sharedStyles.btnPrimaryCompact} style={{ flex:1 }} disabled={loading===shift.id} onClick={() => setClaimModal(shift)}>
                          {loading===shift.id ? "..." : "Inschrijven"}
                        </button>
                      )}
                      {mine && !declined && (
                        <button style={{ ...s.declineBtn, flex:1, opacity: loading===shift.id ? 0.5 : 1 }} disabled={loading===shift.id} onClick={() => handleDecline(shift.id)}>
                          {loading===shift.id ? "..." : "Afmelden"}
                        </button>
                      )}
                      <a href={`/api/shifts/${shift.id}/ical`} aria-label="Exporteer naar agenda" style={{ ...s.icalBtn, flex: claimable || mine ? 0 : 1, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </a>
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
          <input
            className={sharedStyles.input}
            placeholder="Zoek op naam of datum..."
            value={listSearch}
            onChange={e => setListSearch(e.target.value)}
          />
          {monthShifts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", background:"#1a1730", borderRadius:16, border:"1px solid #2e2a4a" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
                <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2e2a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen diensten</p>
              <p style={{ fontSize:12, color:"#a89ec8", marginTop:4 }}>Er zijn geen diensten gepland voor deze maand.</p>
            </div>
          ) : monthShifts.filter(shift =>
              !listSearch ||
              shift.title?.toLowerCase().includes(listSearch.toLowerCase()) ||
              shift.date?.includes(listSearch)
            ).length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 20px", background:"#1a1730", borderRadius:16, border:"1px solid #2e2a4a" }}>
              <p style={{ fontSize:13, color:"#a89ec8", margin:0 }}>Geen diensten gevonden voor "{listSearch}".</p>
            </div>
          ) : monthShifts.filter(shift =>
              !listSearch ||
              shift.title?.toLowerCase().includes(listSearch.toLowerCase()) ||
              shift.date?.includes(listSearch)
            ).map(shift => {
            const mine = isMyShift(shift);
            const isParty = shift.type === "feestje";
            const assignedFiltered = (shift.assignments || []).filter((a: any) => a.status !== "declined");
            const assignedBase = assignedFiltered.length;
            const alreadyInList = assignedFiltered.some((a: any) => a.user_id === userId);
            const assigned = assignedBase + (claimedIds.includes(shift.id) && !alreadyInList ? 1 : 0);
            const accentColor = mine ? C.myShift : isParty ? C.party : assigned >= shift.max_tappers ? C.full : assigned === 0 ? C.empty : C.partial;
            const isPast = parseLocalDate(shift.date) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

            return (
              <div key={shift.id} style={{ background:"#1a1730", borderRadius:16, padding:16, marginBottom:10, borderLeft:`4px solid ${accentColor}`, borderTop:"1px solid #2e2a4a", borderRight:"1px solid #2e2a4a", borderBottom:"1px solid #2e2a4a", opacity: isPast ? 0.45 : 1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                      <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff" }}>{shift.title}</p>
                      {mine && <span style={s.myBadge}>Jij</span>}
                      {isParty && <span style={s.warnBadge}>Feestje</span>}
                      {isPast && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:8, background:"rgba(255,255,255,0.05)", color:"#a89ec8", border:"1px solid #2e2a4a" }}>Verstreken</span>}
                    </div>
                    <p style={{ fontSize:12, color:"#a89ec8" }}>{formatDateShort(shift.date)} · {formatTime(shift.start_time)}–{formatTime(shift.end_time)}</p>
                    <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                      {(shift.assignments || []).filter((a: any) => a.status !== "declined").map((a: any) => (
                        <span key={a.user_id} style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:a.user_id===userId?"rgba(90,74,158,0.35)":"#221f38", color:a.user_id===userId?C.myShift:"#a89ec8", borderWidth:1, borderStyle:"solid", borderColor:a.user_id===userId?"#9b87f0":"#2e2a4a" }}>
                          {a.profile?.full_name?.split(" ")[0] || "?"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                    <p style={{ fontSize:11, color: accentColor }}>{assigned}/{shift.max_tappers}{assigned >= shift.max_tappers && <span style={{ marginLeft:5, fontSize:10, fontWeight:700, color:"#00e5c3", background:"rgba(0,229,195,0.12)", padding:"1px 6px", borderRadius:10 }}>VOL</span>}</p>
                    <a href={`/api/shifts/${shift.id}/ical`} aria-label="Exporteer naar agenda" style={{ ...s.icalBtnSm, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </a>
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
        <div className={sharedStyles.overlay} onClick={() => setClaimModal(null)}>
          <div className={sharedStyles.sheet} role="dialog" aria-modal="true" aria-labelledby="rooster-claim-title" onClick={e => e.stopPropagation()}>
            <div className={sharedStyles.sheetHandle} />
            <h3 className={sharedStyles.sheetTitle} id="rooster-claim-title">Inschrijven</h3>
            <div style={{ background:"#221f38", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{claimModal.title}</p>
              <p style={{ fontSize:13, color:"#a89ec8", marginTop:4 }}>{formatDate(claimModal.date)} · {formatTime(claimModal.start_time)}–{formatTime(claimModal.end_time)}</p>
              {(() => {
                const assigned = (claimModal.assignments || []).filter((a: any) => a.status !== "declined");
                const max = claimModal.max_tappers || 1;
                const pct = Math.min(100, Math.round((assigned.length / max) * 100));
                return (
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <div style={{ fontSize:11, color:"#a89ec8" }}>{assigned.length}/{max} plekken bezet</div>
                    </div>
                    <div style={{ height:6, borderRadius:4, background:"#2e2a4a", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:"#00e5c3", borderRadius:4 }} />
                    </div>
                    {assigned.length > 0 && (
                      <div style={{ marginTop:10, display:"flex", gap:6, flexWrap:"wrap" }}>
                        {assigned.map((a: any) => (
                          <span key={a.user_id} style={{ fontSize:11, padding:"2px 10px", borderRadius:20, background:"#1a1730", border:"1px solid #2e2a4a", color:"#e8e0ff" }}>
                            {a.profile?.full_name?.split(" ")[0] || "?"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <p style={{ fontSize:12, color:"#a89ec8", marginBottom:20, lineHeight:1.5 }}>
              Je ontvangt een bevestiging per e-mail en herinneringen 2 weken en 1 week van tevoren.
            </p>
            <button className={sharedStyles.btnPrimary} disabled={loading===claimModal.id} onClick={() => handleClaim(claimModal)}>
              {loading===claimModal.id ? "Bezig..." : "Ja, ik schrijf me in!"}
            </button>
            <button className={sharedStyles.btnSecondary} style={{ marginTop:8 }} onClick={() => setClaimModal(null)}>Annuleren</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:"16px 16px 100px" },
  toggleRow: { display:"flex", gap:8, marginBottom:16 },
  toggleBtn: { flex:1, padding:"10px", borderRadius:10, fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", transition:"background 0.15s, color 0.15s, border-color 0.15s" },
  monthNav: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, position:"relative" },
  navArrow: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:8, color:"#e8e0ff", fontSize:20, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" },
  monthLabel: { fontSize:18, fontWeight:900, color:"#f0eeff", fontFamily:"'Exo 2',sans-serif", minWidth:140, textAlign:"center", cursor:"pointer" },
  calGrid: { display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:16 },
  dayHeader: { textAlign:"center", fontSize:12, fontWeight:700, color:"#a89ec8", padding:"4px 0" },
  closeBtn: { background:"none", border:"none", color:"#a89ec8", fontSize:16, cursor:"pointer", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  warnBadge: { background:"rgba(244,114,182,0.12)", borderWidth:1, borderStyle:"solid", borderColor:"#f472b6", color:"#f472b6", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:20 },
  myBadge: { background:"rgba(90,74,158,0.35)", borderWidth:1, borderStyle:"solid", borderColor:"#9b87f0", color:"#c4b5fd", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:20 },
  claimBtnSm: { padding:"10px 14px", borderRadius:8, background:"rgba(0,229,195,0.1)", borderWidth:1, borderStyle:"solid", borderColor:"#00e5c3", color:"#00e5c3", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:11, cursor:"pointer" },
  declineBtn: { padding:"10px 14px", borderRadius:10, background:"rgba(255,79,109,0.1)", borderWidth:1, borderStyle:"solid", borderColor:"#ff4f6d", color:"#ff4f6d", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"uppercase" },
  declineBtnSm: { padding:"10px 14px", borderRadius:8, background:"rgba(255,79,109,0.1)", borderWidth:1, borderStyle:"solid", borderColor:"#ff4f6d", color:"#ff4f6d", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:11, cursor:"pointer" },
  icalBtn: { padding:"10px 12px", borderRadius:10, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", cursor:"pointer", fontSize:16 },
  icalBtnSm: { padding:"10px 12px", borderRadius:8, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", fontSize:14, cursor:"pointer" },
};
