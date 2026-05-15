"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Shift, ShiftAssignment, AdminMessage } from "@/types";
import { APP_CONFIG } from "@/lib/config";
import { parseLocalDate, formatDate, formatDateShort, formatTime } from "@/lib/dates";
import { useShiftApi } from "@/hooks/useShiftApi";
import sharedStyles from "@/styles/shared.module.css";

type ClaimableShift = Shift & { open_spots: number };
type AdminMessageWithSender = AdminMessage & { sender?: { full_name: string } };

const MONTH_NL = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

interface Props {
  profile: Profile | null;
  myUpcoming: ShiftAssignment[];
  claimableShifts: ClaimableShift[];
  tapsThisYear: number;
  incomingPlanned: number;
  myRank: number;
  adminMessages: AdminMessageWithSender[];
}

function getAgendaLink(shift: Shift): { url: string; type: "ical" | "google" } {
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  if (isAndroid) {
    const parseLocal = (d: string) => { const [y,m,day] = d.split("-").map(Number); return new Date(y,m-1,day); };
    const start = parseLocal(shift.date);
    const [sh, sm] = shift.start_time.split(":").map(Number);
    const [eh, em] = shift.end_time.split(":").map(Number);
    start.setHours(sh, sm);
    const end = parseLocal(shift.date);
    end.setHours(eh, em);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `🍺 ${shift.title}`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `Tapavond ${APP_CONFIG.orgName}`,
      location: APP_CONFIG.location,
    });
    return { url: `https://calendar.google.com/calendar/render?${params}`, type: "google" };
  }
  return { url: `/api/shifts/${shift.id}/ical`, type: "ical" };
}

export default function DashboardClient({
  profile, myUpcoming, claimableShifts, tapsThisYear, incomingPlanned, myRank, adminMessages,
}: Props) {
  const router = useRouter();
  const mijnDienstenRef = useRef<HTMLDivElement>(null);
  const openDienstenRef = useRef<HTMLDivElement>(null);
  const claimSheetRef = useRef<HTMLDivElement>(null);
  const declineSheetRef = useRef<HTMLDivElement>(null);
  const [upcoming, setUpcoming] = useState<ShiftAssignment[]>(myUpcoming);
  const [claimable, setClaimable] = useState<ClaimableShift[]>(claimableShifts);
  const [claimModal, setClaimModal] = useState<ClaimableShift | null>(null);
  const [declineModal, setDeclineModal] = useState<ShiftAssignment | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [confirmedIds, setConfirmedIds] = useState<string[]>(
    myUpcoming.filter(a => a.status === "confirmed").map(a => a.shift_id)
  );
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const { loading, error: fetchError, setError: setFetchError, shiftAction } = useShiftApi();
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("dismissedMessages") || "[]")); } catch { return new Set(); }
  });

  // Month navigation for mijn diensten
  const [myMonth, setMyMonth] = useState(() => {
    const first = myUpcoming[0]?.shift;
    return first ? parseLocalDate(first.date).getMonth() : new Date().getMonth();
  });
  const [myYear, setMyYear] = useState(() => {
    const first = myUpcoming[0]?.shift;
    return first ? parseLocalDate(first.date).getFullYear() : new Date().getFullYear();
  });

  // Month navigation for open diensten
  const [openMonth, setOpenMonth] = useState(() => {
    const first = claimableShifts[0];
    return first ? parseLocalDate(first.date).getMonth() : new Date().getMonth();
  });
  const [openYear, setOpenYear] = useState(() => {
    const first = claimableShifts[0];
    return first ? parseLocalDate(first.date).getFullYear() : new Date().getFullYear();
  });

  function prevMyMonth() {
    if (myMonth === 0) { setMyMonth(11); setMyYear(y => y - 1); } else setMyMonth(m => m - 1);
  }
  function nextMyMonth() {
    if (myMonth === 11) { setMyMonth(0); setMyYear(y => y + 1); } else setMyMonth(m => m + 1);
  }
  function prevOpenMonth() {
    if (openMonth === 0) { setOpenMonth(11); setOpenYear(y => y - 1); } else setOpenMonth(m => m - 1);
  }
  function nextOpenMonth() {
    if (openMonth === 11) { setOpenMonth(0); setOpenYear(y => y + 1); } else setOpenMonth(m => m + 1);
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Tapper";
  const target = (profile?.preferred_frequency || 4) * 4;
  const pct = Math.min(100, Math.round((tapsThisYear / Math.max(target, 1)) * 100));

  const [pctAnimated, setPctAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPctAnimated(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  useEffect(() => {
    if (!claimModal) return;
    const t = setTimeout(() => claimSheetRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [claimModal]);
  useEffect(() => {
    if (!declineModal) return;
    const t = setTimeout(() => declineSheetRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [declineModal]);

  const nextAssignment = upcoming[Math.min(heroIndex, Math.max(0, upcoming.length - 1))];
  const nextShift = nextAssignment?.shift;
  const daysUntilNext = nextShift
    ? Math.ceil((parseLocalDate(nextShift.date).getTime() - Date.now()) / (1000*60*60*24))
    : null;

  const filteredUpcoming = upcoming.filter(a => {
    if (!a.shift?.date) return false;
    const d = parseLocalDate(a.shift.date);
    return d.getMonth() === myMonth && d.getFullYear() === myYear;
  });

  const filteredClaimable = claimable.filter(s => {
    const d = parseLocalDate(s.date);
    return d.getMonth() === openMonth && d.getFullYear() === openYear;
  });

  const visibleMessages = adminMessages.filter(m => !dismissedMessages.has(m.id));

  async function handleConfirm(shiftId: string) {
    setConfirmedIds(p => [...p, shiftId]);
    const ok = await shiftAction(shiftId, "confirm");
    if (!ok) setConfirmedIds(p => p.filter(id => id !== shiftId));
  }

  async function handleClaim(shift: ClaimableShift) {
    const ok = await shiftAction(shift.id, "claim");
    if (ok) {
      setClaimable(cs => cs.filter(s => s.id !== shift.id));
      setUpcoming(u => [...u, {
        id: "", user_id: "", created_at: "",
        shift_id: shift.id, status: "assigned" as const,
        shift: { ...shift },
      }].sort((a,b) => a.shift!.date.localeCompare(b.shift!.date)));
      setClaimSuccess(shift.title);
      setTimeout(() => setClaimSuccess(null), 3000);
      setTimeout(() => mijnDienstenRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 300);
    }
    setClaimModal(null);
  }

  async function handleDecline(assignment: ShiftAssignment) {
    const ok = await shiftAction(assignment.shift_id, "decline");
    if (ok) { setUpcoming(u => u.filter(a => a.shift_id !== assignment.shift_id)); setHeroIndex(0); }
    setDeclineModal(null);
  }

  function handleShare(shift: Shift) {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: shift.title,
        text: `Tapavond ${shift.title} — ${formatDate(shift.date)} ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}. Schrijf je in op Taprooster!`,
        url: window.location.origin + "/rooster",
      }).catch(() => {});
    }
  }

  function handleAgenda(shift: Shift) {
    const { url, type } = getAgendaLink(shift);
    if (type === "google") {
      window.open(url, "_blank");
    } else {
      const a = document.createElement("a");
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  function openShiftBorderColor(shift: ClaimableShift) {
    if (shift.type === "feestje") return "#f472b6";
    const filled = (shift as any).assignments?.filter((a: any) => a.status !== "declined").length || 0;
    return filled > 0 ? "#ffb547" : "#00e5c3";
  }

  function openShiftBg(shift: ClaimableShift) {
    if (shift.type === "feestje") return "rgba(244,114,182,0.04)";
    const filled = (shift as any).assignments?.filter((a: any) => a.status !== "declined").length || 0;
    return filled > 0 ? "rgba(255,181,71,0.04)" : "rgba(0,229,195,0.04)";
  }

  return (
    <div style={s.page}>
      {fetchError && (
        <div style={s.errorBanner}>
          <span>⚠️ {fetchError}</span>
          <button onClick={() => setFetchError(null)} style={{ background:"none", border:"none", color:"#ff4f6d", fontSize:16, cursor:"pointer", padding:"0 4px", marginLeft:"auto", lineHeight:1, flexShrink:0 }} aria-label="Sluiten">✕</button>
        </div>
      )}
      {claimSuccess && (
        <div className={sharedStyles.bannerIn} style={{background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, marginBottom:14, display:"flex", alignItems:"center", gap:8}}>
          ✅ Ingeschreven voor {claimSuccess}!
        </div>
      )}

      {/* Greeting */}
      <div style={{ marginBottom:20 }}>
        <p style={{ fontSize:13, color:"#a89ec8", marginBottom:4 }}>Welkom terug,</p>
        <h1 style={s.greeting}>
          {firstName} 👋
          {profile?.role === "admin" && <span className={`${sharedStyles.badge} ${sharedStyles.badgeMint}`} style={{ fontSize:11, padding:"2px 10px" }}>⚡ Admin</span>}
        </h1>
      </div>

      {/* Next shift hero — timeline layout */}
      {nextShift ? (
        <div style={s.heroCard}>
          <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
            {/* Left: date column */}
            {(() => {
              const d = parseLocalDate(nextShift.date);
              const monthShort = d.toLocaleDateString("nl-NL", { month:"short" }).replace(".","").toUpperCase();
              return (
                <div style={{ flexShrink:0, width:52, textAlign:"center", background:"rgba(0,229,195,0.06)", border:"1px solid rgba(0,229,195,0.2)", borderRadius:12, padding:"12px 6px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:"monospace", fontSize:28, fontWeight:700, color:"#00e5c3", lineHeight:1 }}>{d.getDate()}</span>
                  <span style={{ fontFamily:"'Exo 2',sans-serif", fontSize:10, fontWeight:700, color:"#a89ec8", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:3 }}>{monthShort}</span>
                </div>
              );
            })()}
            {/* Right: content */}
            <div key={heroIndex} className={sharedStyles.fadeIn} style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <p style={{ ...s.heroLabel, margin:0 }}>Volgende dienst</p>
                {upcoming.length > 1 && (
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <button aria-label="Vorige dienst" onClick={() => setHeroIndex(i => Math.max(0, i - 1))} style={{ ...s.navArrowSm, width:44, height:44, fontSize:16, opacity: heroIndex === 0 ? 0.35 : 1 }}>‹</button>
                    <span style={{ fontSize:10, color:"#a89ec8", fontFamily:"monospace" }}>{heroIndex + 1}/{upcoming.length}</span>
                    <button aria-label="Volgende dienst" onClick={() => setHeroIndex(i => Math.min(upcoming.length - 1, i + 1))} style={{ ...s.navArrowSm, width:44, height:44, fontSize:16, opacity: heroIndex === upcoming.length - 1 ? 0.35 : 1 }}>›</button>
                  </div>
                )}
              </div>
              <h2 style={s.heroTitle}>{nextShift.title}</h2>
              <p style={{ ...s.heroSub, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", margin:0 }}>
                <span>{formatTime(nextShift.start_time)}–{formatTime(nextShift.end_time)}</span>
                {daysUntilNext !== null && (
                  <span style={{ color: daysUntilNext <= 1 ? "#00e5c3" : "#a89ec8" }}>
                    · {daysUntilNext === 0 ? "Vandaag 🔥" : daysUntilNext === 1 ? "Morgen 🍺" : `over ${daysUntilNext} dagen`}
                  </span>
                )}
              </p>
              {(confirmedIds.includes(nextAssignment.shift_id) || nextAssignment.status === "confirmed") && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:8, padding:"3px 10px", borderRadius:20, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", fontSize:11, color:"#00e5c3", fontWeight:700 }}>✅ Bevestigd</span>
              )}
            </div>
          </div>
          {/* Action row */}
          <div style={{ marginTop:14 }}>
            {confirmedIds.includes(nextAssignment.shift_id) || nextAssignment.status === "confirmed" ? (
              <a
                href={`/api/shifts/${nextShift.id}/ical`}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 12px", borderRadius:12, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, textDecoration:"none" }}
                onClick={(e) => { if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) { e.preventDefault(); handleAgenda(nextShift); } }}
              >📅 Zet in agenda</a>
            ) : (
              <div style={s.confirmBox}>
                <p style={{ fontSize:12, color:"#a89ec8", marginBottom:8 }}>Ben jij erbij?</p>
                <div style={{ display:"flex", gap:8 }}>
                  <button style={{ ...s.btnYes, opacity: loading===nextAssignment.shift_id ? 0.5 : 1 }} disabled={loading===nextAssignment.shift_id} onClick={() => handleConfirm(nextAssignment.shift_id)}>✅ Ik ben erbij</button>
                  <button style={s.btnNo} onClick={() => setDeclineModal(nextAssignment)}>🔴 Ik kan niet</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{textAlign:"center", padding:"32px 20px", background:"#1a1730", borderRadius:16, border:"1px solid #2e2a4a"}}>
          <div style={{fontSize:40, marginBottom:10}}>🍺</div>
          <p style={{fontSize:14, fontWeight:700, color:"#f0eeff", margin:0}}>Geen geplande diensten</p>
          <p style={{fontSize:12, color:"#a89ec8", margin:"4px 0 0", marginBottom: claimable.length > 0 ? 12 : 0}}>Je staat nog nergens ingepland.</p>
          {claimable.length > 0 && (
            <button
              style={{ padding:"8px 18px", borderRadius:20, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer" }}
              onClick={() => openDienstenRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}
            >Bekijk open diensten ↓</button>
          )}
        </div>
      )}

      {/* Admin berichten */}
      {visibleMessages.length > 0 && (
        <>
          <p className={sharedStyles.sectionTitle} style={{ margin:"20px 0 8px" }}>Berichten van admin</p>
          {visibleMessages.map((msg) => {
            const senderName = msg.sender?.full_name?.split(" ")[0] || "Admin";
            return (
              <div key={msg.id} className={sharedStyles.card}>
                <div style={{ display:"flex", gap:10 }}>
                  <span style={{ fontSize:20 }}>📢</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", marginBottom:2 }}>{msg.title}</p>
                    <p style={{ fontSize:11, color:"#a89ec8", marginBottom:6 }}>van {senderName} · {new Date(msg.created_at).toLocaleString("nl-NL", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</p>
                    <p style={{ fontSize:12, color:"#b8b0d4", lineHeight:1.5 }}>{msg.body}</p>
                  </div>
                  <button onClick={() => {
                    const next = new Set([...dismissedMessages, msg.id]);
                    setDismissedMessages(next);
                    try { localStorage.setItem("dismissedMessages", JSON.stringify([...next])); } catch {}
                  }} style={{ background:"none", border:"none", color:"#a89ec8", fontSize:16, cursor:"pointer", padding:"0 4px", flexShrink:0, alignSelf:"flex-start", lineHeight:1 }} aria-label="Sluiten">✕</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Stats */}
      <p className={sharedStyles.sectionTitle} style={{ margin:"20px 0 8px" }}>Jouw statistieken</p>
      <div style={s.statRow}>
        <div style={{ ...s.statCard, cursor:"pointer" }} onClick={() => router.push("/account")}>
          <p style={s.statVal}>{tapsThisYear}</p>
          <p style={s.statLabel}>Getapt dit jaar</p>
        </div>
        <div style={{ ...s.statCard, cursor:"pointer" }} onClick={() => mijnDienstenRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}>
          <p style={s.statVal}>{incomingPlanned}</p>
          <p style={s.statLabel}>Ingeplande diensten</p>
        </div>
      </div>
      <div className={sharedStyles.card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:12, color:"#a89ec8" }}>Voortgang dit jaar ({tapsThisYear}/{target})</span>
          <span style={{ fontFamily:"monospace", fontSize:12, color:"#00e5c3" }}>{pct}%</span>
        </div>
        <div style={{ ...s.progressWrap, position:"relative" }}>
          <div style={{ ...s.progressFill, width:`${pctAnimated}%` }}/>
          <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:1, height:"100%", background:"rgba(255,255,255,0.25)" }}/>
        </div>
        {myRank > 0 && <p style={{ fontSize:11, color:"#a89ec8", marginTop:6 }}>Je staat op plek <strong style={{ color:"#00e5c3" }}>#{myRank}</strong> dit jaar 🏆</p>}
        {tapsThisYear >= Math.round((new Date().getMonth() + 1) / 12 * target) && (
          <p style={{fontSize:11, color:"#00e5c3", textAlign:"center", margin:"4px 0 0"}}>Je ligt op koers ✓</p>
        )}
      </div>

      {/* Mijn diensten */}
      {upcoming.length > 0 && (
        <>
          <div ref={mijnDienstenRef} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"20px 0 8px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <p className={sharedStyles.sectionTitle} style={{ margin:0 }}>Mijn diensten</p>
              <a href="/api/shifts/my-ical" title="Exporteer alle diensten naar agenda" style={{ fontSize:14, color:"#a89ec8", textDecoration:"none", lineHeight:1 }}>📅</a>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button onClick={prevMyMonth} style={s.navArrowSm}>‹</button>
              <span style={{ fontSize:12, fontWeight:700, color:"#e8e0ff", minWidth:82, textAlign:"center" }}>
                {MONTH_NL[myMonth]} {myYear}
              </span>
              <button onClick={nextMyMonth} style={s.navArrowSm}>›</button>
            </div>
          </div>
          {filteredUpcoming.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 20px", background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:12, color:"#a89ec8", fontSize:12 }}>
              Geen diensten in {MONTH_NL[myMonth]}.
            </div>
          ) : filteredUpcoming.map((a): React.ReactNode => {
            const sh = a.shift;
            if (!sh) return null;
            const isFirst = a === upcoming[0];
            const isConfirmed = confirmedIds.includes(a.shift_id) || a.status === "confirmed";
            const daysUntil = Math.ceil((parseLocalDate(sh.date).getTime() - Date.now()) / (1000*60*60*24));
            const urgentUnconfirmed = !isConfirmed && daysUntil >= 0 && daysUntil < 3;
            const filledCount = (sh as any).assignments?.filter((a: any) => a.status !== "declined").length ?? -1;
            const accentColor = sh.type === "feestje" ? "#f472b6" : (filledCount >= 0 && filledCount < (sh.max_tappers || 2)) ? "#ffb547" : "#00e5c3";
            const rgbAccent = sh.type === "feestje" ? "244,114,182" : (filledCount >= 0 && filledCount < (sh.max_tappers || 2)) ? "255,181,71" : "0,229,195";
            return (
              <div key={a.shift_id} className={sharedStyles.card} style={{ borderLeft:`4px solid ${accentColor}`, background:`linear-gradient(90deg, rgba(${rgbAccent},0.04) 0%, #1a1730 40%)` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1, minWidth:0, marginRight:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff", margin:0 }}>{sh.title}</p>
                      {sh.type==="feestje" && <span className={`${sharedStyles.badge} ${sharedStyles.badgeParty}`}>Feestje</span>}
                      {isFirst && <span className={`${sharedStyles.badge} ${sharedStyles.badgeMint}`}>Eerstvolgende</span>}
                      {urgentUnconfirmed && <span className={`${sharedStyles.badge} ${sharedStyles.badgeAmber}`}>⏰ Bevestig — nog {daysUntil === 0 ? "vandaag" : `${daysUntil} dag${daysUntil !== 1 ? "en" : ""}`}</span>}
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:"#e8e0ff", marginBottom:2 }}>{formatDateShort(sh.date)}</p>
                    <p style={{ fontSize:12, color:"#a89ec8" }}>{formatTime(sh.start_time)}–{formatTime(sh.end_time)}</p>
                    {sh.admin_note && <p style={{ fontSize:11, color:"#a89ec8", marginTop:4 }}>📌 {sh.admin_note}</p>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"stretch", minWidth:88 }}>
                    {isConfirmed ? (
                      <div style={s.actionBtnConfirmed}>✅ Bevestigd</div>
                    ) : (
                      <button style={{ ...s.actionBtn, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", opacity: loading===a.shift_id ? 0.5 : 1 }} disabled={loading===a.shift_id} onClick={() => handleConfirm(a.shift_id)}>✅ Bevestigen</button>
                    )}
                    <button style={{ ...s.actionBtn, background:"rgba(255,79,109,0.08)", border:"1px solid #ff4f6d", color:"#ff4f6d", opacity: loading===a.shift_id ? 0.5 : 1 }} disabled={loading===a.shift_id} onClick={() => setDeclineModal(a)}>Afmelden</button>
                    <div style={{ display:"flex", gap:4 }}>
                      <a
                        href={`/api/shifts/${sh.id}/ical`}
                        style={{ ...s.iconSmBtn, textDecoration:"none", flex:1 }}
                        onClick={(e) => { if (/Android/i.test(navigator.userAgent)) { e.preventDefault(); handleAgenda(sh); } }}
                      >📅</a>
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <button style={{ ...s.iconSmBtn, flex:1 }} onClick={() => handleShare(sh)} title="Deel dienst" aria-label="Deel dienst">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <a
            href="/api/shifts/my-ical"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 14px", borderRadius:12, background:"#1a1730", border:"1px solid #2e2a4a", color:"#a89ec8", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:12, textDecoration:"none", marginTop:8 }}
          >
            📅 Zet al mijn diensten in mijn agenda
          </a>
        </>
      )}

      {/* Open diensten */}
      {claimable.length > 0 && (
        <>
          <div ref={openDienstenRef} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"20px 0 8px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, margin:0 }}>
              <p className={sharedStyles.sectionTitle} style={{ margin:0 }}>Open diensten</p>
              <span className={`${sharedStyles.badge} ${sharedStyles.badgeAmber}`}>{claimable.length}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button onClick={prevOpenMonth} style={s.navArrowSm}>‹</button>
              <span style={{ fontSize:12, fontWeight:700, color:"#e8e0ff", minWidth:82, textAlign:"center" }}>
                {MONTH_NL[openMonth]} {openYear}
              </span>
              <button onClick={nextOpenMonth} style={s.navArrowSm}>›</button>
            </div>
          </div>
          {filteredClaimable.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 20px", background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:12, color:"#a89ec8", fontSize:12 }}>
              Geen open diensten in {MONTH_NL[openMonth]}.
            </div>
          ) : filteredClaimable.map((shift) => {
            const borderColor = openShiftBorderColor(shift);
            const bgGrad = openShiftBg(shift);
            const assignedNames = (shift as any).assignments?.filter((a: any) => a.status !== "declined") || [];
            const isFull = assignedNames.length >= shift.max_tappers;
            return (
              <div key={shift.id} className={sharedStyles.card} style={{ borderLeft:`4px solid ${borderColor}`, background:`linear-gradient(90deg, ${bgGrad} 0%, #1a1730 40%)` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff", margin:0 }}>{shift.title}</p>
                    <p style={{ fontSize:13, fontWeight:700, color:"#e8e0ff", marginBottom:2, marginTop:2 }}>{formatDateShort(shift.date)}</p>
                    <p style={{ fontSize:12, color:"#a89ec8" }}>{formatTime(shift.start_time)}–{formatTime(shift.end_time)}</p>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, color:"#a89ec8" }}>{shift.open_spots} open plek{shift.open_spots > 1 ? "ken" : ""}</span>
                      {assignedNames.map((a: any) => (
                        <span key={a.user_id} style={{ fontSize:11, padding:"1px 8px", borderRadius:20, background:"#221f38", border:"1px solid #2e2a4a", color:"#a89ec8" }}>
                          {a.profile?.full_name?.split(" ")[0] || "?"}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isFull ? (
                    <span style={{ fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:12, background:"rgba(0,229,195,0.08)", border:"1px solid #2e2a4a", color:"#a89ec8" }}>Vol</span>
                  ) : (
                    <button className={sharedStyles.btnPrimaryCompact} disabled={loading===shift.id} onClick={() => setClaimModal(shift)}>
                      {loading===shift.id ? "..." : "Inschrijven"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <a href="/rooster" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:12, color:"#00e5c3", textDecoration:"none", padding:"12px 16px", borderRadius:12, background:"#1a1730", border:"1px solid #2e2a4a", marginTop:4 }}>
            Bekijk alle diensten op de roosterpagina →
          </a>
        </>
      )}

      {/* Claim modal */}
      {claimModal && (
        <div className={sharedStyles.overlay} onClick={() => setClaimModal(null)}>
          <div ref={claimSheetRef} className={sharedStyles.sheet} role="dialog" aria-modal="true" aria-labelledby="claim-title" tabIndex={-1} onClick={e => e.stopPropagation()} onKeyDown={(e) => { if (e.key !== "Tab") return; const focusable = e.currentTarget.querySelectorAll<HTMLElement>('button,[href],input,[tabindex]:not([tabindex="-1"])'); const first = focusable[0]; const last = focusable[focusable.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }}>
            <div className={sharedStyles.sheetHandle}/>
            <h3 id="claim-title" className={sharedStyles.sheetTitle}>Inschrijven voor dienst</h3>
            <div style={{ background:"#221f38", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{claimModal.title}</p>
              <p style={{ fontSize:13, color:"#a89ec8", marginTop:4 }}>{formatDate(claimModal.date)} · {formatTime(claimModal.start_time)}–{formatTime(claimModal.end_time)}</p>
              {(claimModal as any).assignments?.filter((a: any) => a.status !== "declined").length > 0 && (
                <div style={{ marginTop:10 }}>
                  <p style={{ fontSize:11, color:"#a89ec8", marginBottom:6 }}>Al ingeroosterd:</p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {(claimModal as any).assignments.filter((a: any) => a.status !== "declined").map((a: any) => (
                      <span key={a.user_id} style={{ fontSize:12, padding:"2px 10px", borderRadius:20, background:"#1a1730", border:"1px solid #2e2a4a", color:"#e8e0ff" }}>
                        {a.profile?.full_name?.split(" ")[0] || "?"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p style={{ fontSize:12, color:"#a89ec8", marginBottom:20, lineHeight:1.5 }}>
              Je ontvangt een e-mail bevestiging en herinneringen 2 weken en 1 week van tevoren.
            </p>
            <button className={sharedStyles.btnPrimary} disabled={loading===claimModal.id} onClick={() => handleClaim(claimModal)}>
              {loading===claimModal.id ? "Bezig..." : "✅ Ja, ik schrijf me in!"}
            </button>
            <button className={sharedStyles.btnSecondary} style={{ marginTop:8 }} onClick={() => setClaimModal(null)}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Decline modal */}
      {declineModal && (
        <div className={sharedStyles.overlay} onClick={() => setDeclineModal(null)}>
          <div ref={declineSheetRef} className={sharedStyles.sheet} role="dialog" aria-modal="true" aria-labelledby="decline-title" tabIndex={-1} onClick={e => e.stopPropagation()} onKeyDown={(e) => { if (e.key !== "Tab") return; const focusable = e.currentTarget.querySelectorAll<HTMLElement>('button,[href],input,[tabindex]:not([tabindex="-1"])'); const first = focusable[0]; const last = focusable[focusable.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }}>
            <div className={sharedStyles.sheetHandle}/>
            <h3 id="decline-title" className={sharedStyles.sheetTitle}>Afmelden voor dienst</h3>
            <p style={{ fontSize:13, color:"#a89ec8", marginBottom:16 }}>
              Alle andere tappers worden genotificeerd dat er een open plek is.
            </p>
            <div style={{ background:"#221f38", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{declineModal.shift?.title}</p>
              <p style={{ fontSize:13, color:"#a89ec8", marginTop:4 }}>
                {declineModal.shift ? formatDate(declineModal.shift.date) : ""} · {formatTime(declineModal.shift?.start_time || "")}–{formatTime(declineModal.shift?.end_time || "")}
              </p>
            </div>
            <button className={sharedStyles.btnPrimary} style={{ background:"linear-gradient(135deg,#ff4f6d,#cc3355)", boxShadow:"0 4px 20px rgba(255,79,109,0.3)" }}
              disabled={loading===declineModal.shift_id}
              onClick={() => handleDecline(declineModal)}>
              {loading===declineModal.shift_id ? "Bezig..." : "🔴 Ja, ik meld me af"}
            </button>
            <button className={sharedStyles.btnSecondary} style={{ marginTop:8 }} onClick={() => setDeclineModal(null)}>Toch niet</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:"16px 16px 100px" },
  errorBanner: { background:"rgba(255,79,109,0.1)", border:"1px solid #ff4f6d", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#ff4f6d", marginBottom:14, display:"flex", alignItems:"center", gap:8 },
  greeting: { fontSize:26, fontWeight:900, color:"#f0eeff", fontFamily:"'Exo 2',sans-serif", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
  heroCard: { background:"linear-gradient(135deg,#1a1730,#221f38)", border:"1px solid #00e5c3", borderRadius:16, padding:18, marginBottom:12, boxShadow:"0 0 30px rgba(0,229,195,0.08)" },
  heroLabel: { fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:"#00e5c3", textTransform:"uppercase", marginBottom:4 },
  heroTitle: { fontSize:20, fontWeight:900, color:"#f0eeff", fontFamily:"'Exo 2',sans-serif", margin:0 },
  heroSub: { fontSize:13, color:"#a89ec8", marginTop:2 },
  confirmBox: { background:"#221f38", borderRadius:16, padding:12 },
  btnYes: { flex:1, padding:"12px 10px", borderRadius:12, background:"rgba(0,229,195,0.1)", color:"#00e5c3", border:"1px solid #00e5c3", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },
  btnNo: { flex:1, padding:"12px 10px", borderRadius:12, background:"rgba(255,79,109,0.1)", color:"#ff4f6d", border:"1px solid #ff4f6d", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },
  statRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 },
  statCard: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, textAlign:"center" },
  statVal: { fontFamily:"monospace", fontSize:28, fontWeight:700, color:"#00e5c3", margin:0 },
  statLabel: { fontSize:10, fontWeight:700, color:"#a89ec8", letterSpacing:"0.08em", textTransform:"uppercase", marginTop:4, margin:0 },
  progressWrap: { background:"#2e2a4a", borderRadius:4, height:6, overflow:"hidden" },
  progressFill: { height:"100%", borderRadius:4, background:"linear-gradient(90deg,#00e5c3,#00b89c)", transition:"width 0.6s ease" },
  // Consistent action buttons for mijn diensten
  actionBtn: { fontSize:11, fontWeight:700, padding:"10px 8px", borderRadius:10, fontFamily:"'Exo 2',sans-serif", cursor:"pointer", textAlign:"center" as const, width:"100%" },
  actionBtnConfirmed: { fontSize:11, fontWeight:700, padding:"6px 8px", borderRadius:10, fontFamily:"'Exo 2',sans-serif", textAlign:"center" as const, width:"100%", background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3" },
  iconSmBtn: { fontSize:14, padding:"5px 8px", borderRadius:8, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", minHeight:44, boxSizing:"border-box" as const },
  navArrowSm: { background:"#221f38", border:"1px solid #2e2a4a", borderRadius:6, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, color:"#b8b0d4", flexShrink:0, padding:0 },
};
