"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Shift, ShiftAssignment, AdminMessage } from "@/types";
import { APP_CONFIG } from "@/lib/config";
import { parseLocalDate, formatDate, formatDateShort } from "@/lib/dates";

type ClaimableShift = Shift & { open_spots: number };

interface Props {
  profile: Profile | null;
  myUpcoming: ShiftAssignment[];
  claimableShifts: ClaimableShift[];
  tapsThisYear: number;
  incomingPlanned: number;
  myRank: number;
  adminMessages: AdminMessage[];
}

// Platform detection for agenda link
function getAgendaLink(shift: Shift): { url: string; type: "ical" | "google" } {
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    // Google Calendar deep link
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

  // iOS + desktop: .ics download
  return { url: `/api/shifts/${shift.id}/ical`, type: "ical" };
}

export default function DashboardClient({
  profile, myUpcoming, claimableShifts, tapsThisYear, incomingPlanned, myRank, adminMessages,
}: Props) {
  const router = useRouter();
  const mijnDienstenRef = useRef<HTMLDivElement>(null);
  const [upcoming, setUpcoming] = useState<ShiftAssignment[]>(myUpcoming);
  const [claimable, setClaimable] = useState<ClaimableShift[]>(claimableShifts);
  const [claimModal, setClaimModal] = useState<ClaimableShift | null>(null);
  const [declineModal, setDeclineModal] = useState<ShiftAssignment | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] || "Tapper";
  const target = (profile?.preferred_frequency || 4) * 12;
  const pct = Math.min(100, Math.round((tapsThisYear / Math.max(target, 1)) * 100));

  const nextAssignment = upcoming[0];
  const nextShift = nextAssignment?.shift;
  const daysUntilNext = nextShift
    ? Math.ceil((parseLocalDate(nextShift.date).getTime() - Date.now()) / (1000*60*60*24))
    : null;

  async function handleConfirm(shiftId: string) {
    setLoading(shiftId);
    const res = await fetch(`/api/shifts/${shiftId}/assign`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"confirm" }),
    });
    if (res.ok) {
      setConfirmedIds(p => [...p, shiftId]);
    } else {
      const err = await res.json().catch(() => ({}));
      setFetchError(err.error ?? "Bevestigen mislukt. Probeer opnieuw.");
    }
    setLoading(null);
  }

  async function handleClaim(shift: ClaimableShift) {
    setLoading(shift.id);
    const res = await fetch(`/api/shifts/${shift.id}/assign`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"claim" }),
    });
    if (res.ok) {
      setClaimable(cs => cs.filter(s => s.id !== shift.id));
      setUpcoming(u => [...u, {
        id: "", user_id: "", created_at: "",
        shift_id: shift.id, status: "assigned" as const,
        shift: { ...shift },
      }].sort((a,b) => a.shift!.date.localeCompare(b.shift!.date)));
      setClaimSuccess(shift.title);
      setTimeout(() => setClaimSuccess(null), 3000);
      setTimeout(() => mijnDienstenRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 300);
    } else {
      const err = await res.json().catch(() => ({}));
      setFetchError(err.error ?? "Inschrijven mislukt. Probeer opnieuw.");
    }
    setClaimModal(null);
    setLoading(null);
  }

  async function handleDecline(assignment: ShiftAssignment) {
    setLoading(assignment.shift_id);
    const res = await fetch(`/api/shifts/${assignment.shift_id}/assign`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"decline" }),
    });
    if (res.ok) {
      setUpcoming(u => u.filter(a => a.shift_id !== assignment.shift_id));
    } else {
      const err = await res.json().catch(() => ({}));
      setFetchError(err.error ?? "Afmelden mislukt. Probeer opnieuw.");
    }
    setDeclineModal(null);
    setLoading(null);
  }

  function handleShare(shift: Shift) {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: shift.title,
        text: `Tapavond ${shift.title} — ${formatDate(shift.date)} ${shift.start_time}–${shift.end_time}. Schrijf je in op Taprooster!`,
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

  const shiftColor = (type: string) => type === "feestje" ? "#3b82f6" : "#00e5c3";

  return (
    <div style={s.page}>
      {fetchError && (
        <div style={s.errorBanner} onClick={() => setFetchError(null)}>
          ⚠️ {fetchError}
        </div>
      )}
      {claimSuccess && (
        <div style={{background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, marginBottom:14, display:"flex", alignItems:"center", gap:8}}>
          ✅ Ingeschreven voor {claimSuccess}!
        </div>
      )}
      {/* Greeting */}
      <div style={{ marginBottom:20 }}>
        <p style={{ fontSize:13, color:"#8b80b0", marginBottom:4 }}>Welkom terug,</p>
        <h1 style={s.greeting}>
          {firstName} 👋
          {profile?.role === "admin" && <span style={s.adminBadge}>⚡ Admin</span>}
        </h1>
      </div>

      {/* Next shift hero */}
      {nextShift ? (
        <div style={s.heroCard}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <p style={s.heroLabel}>Volgende dienst</p>
              <h2 style={s.heroTitle}>{nextShift.title}</h2>
              <p style={s.heroSub}>{formatDate(nextShift.date)} · {nextShift.start_time}–{nextShift.end_time}</p>
            </div>
            {daysUntilNext !== null && (
              <div style={{ textAlign:"center", minWidth:64 }}>
                {daysUntilNext === 0 ? (
                  <p style={{ ...s.countdown, fontSize:22 }}>Vandaag! 🔥</p>
                ) : daysUntilNext === 1 ? (
                  <>
                    <p style={{ ...s.countdown, fontSize:20 }}>Morgen!</p>
                    <p style={{ fontSize:10, color:"#8b80b0", letterSpacing:1, textTransform:"uppercase", margin:0 }}>🍺</p>
                  </>
                ) : (
                  <>
                    <p style={s.countdown}>{daysUntilNext}</p>
                    <p style={{ fontSize:10, color:"#8b80b0", letterSpacing:1, textTransform:"uppercase", margin:0 }}>dagen</p>
                  </>
                )}
              </div>
            )}
          </div>
          {confirmedIds.includes(nextAssignment.shift_id) || nextAssignment.status === "confirmed" ? (
            <div style={s.confirmedBanner}>✅ Bevestigd! Tot dan 🍺</div>
          ) : (
            <div style={s.confirmBox}>
              <p style={{ fontSize:12, color:"#8b80b0", marginBottom:8 }}>Ben jij erbij?</p>
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...s.btnYes, opacity: loading===nextAssignment.shift_id ? 0.5 : 1 }} disabled={loading===nextAssignment.shift_id} onClick={() => handleConfirm(nextAssignment.shift_id)}>✅ Ik ben erbij</button>
                <button style={s.btnNo} onClick={() => setDeclineModal(nextAssignment)}>🔴 Ik kan niet</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{textAlign:"center", padding:"32px 20px", background:"#1a1730", borderRadius:16, border:"1px solid #2e2a4a"}}>
          <div style={{fontSize:40, marginBottom:10}}>🍺</div>
          <p style={{fontSize:14, fontWeight:700, color:"#f0eeff", margin:0}}>Geen geplande diensten</p>
          <p style={{fontSize:12, color:"#8b80b0", marginTop:4, margin:"4px 0 0"}}>Je staat nog nergens ingepland.</p>
        </div>
      )}

      {/* Stats */}
      <p style={s.sectionTitle}>Jouw statistieken</p>
      <div style={s.statRow}>
        <div style={s.statCard}>
          <p style={s.statVal}>{tapsThisYear}</p>
          <p style={s.statLabel}>Getapt dit jaar</p>
        </div>
        <div style={s.statCard}>
          <p style={s.statVal}>{incomingPlanned}</p>
          <p style={s.statLabel}>Ingeplande diensten</p>
        </div>
      </div>
      <div style={s.card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:12, color:"#8b80b0" }}>Voortgang dit jaar ({tapsThisYear}/{target})</span>
          <span style={{ fontFamily:"monospace", fontSize:12, color:"#00e5c3" }}>{pct}%</span>
        </div>
        <div style={{ ...s.progressWrap, position:"relative" }}>
          <div style={{ ...s.progressFill, width:`${pct}%` }}/>
          <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:1, height:"100%", background:"rgba(255,255,255,0.25)" }}/>
        </div>
        {myRank > 0 && <p style={{ fontSize:11, color:"#8b80b0", marginTop:6 }}>Je staat op plek <strong style={{ color:"#00e5c3" }}>#{myRank}</strong> dit jaar 🏆</p>}
        {tapsThisYear >= Math.round((new Date().getMonth() + 1) / 12 * target)
          ? <p style={{fontSize:11, color:"#00e5c3", textAlign:"center", margin:"4px 0 0"}}>Je ligt op koers ✓</p>
          : <p style={{fontSize:11, color:"#ffb547", textAlign:"center", margin:"4px 0 0"}}>Je loopt iets achter</p>
        }
      </div>

      {/* All upcoming shifts */}
      {upcoming.length > 0 && (
        <>
          <p ref={mijnDienstenRef} style={s.sectionTitle}>Mijn diensten</p>
          {upcoming.map((a) => {
            const sh = a.shift;
            if (!sh) return null;
            const isFirst = a === nextAssignment;
            const isConfirmed = confirmedIds.includes(a.shift_id) || a.status === "confirmed";
            const daysUntil = Math.ceil((parseLocalDate(sh.date).getTime() - Date.now()) / (1000*60*60*24));
            const urgentUnconfirmed = !isConfirmed && daysUntil >= 0 && daysUntil < 3;
            const accentColor = shiftColor(sh.type);
            return (
              <div key={a.shift_id} style={{ ...s.card, borderLeft:`4px solid ${accentColor}`, background:`linear-gradient(90deg, rgba(${sh.type==="feestje"?"59,130,246":"0,229,195"},0.04) 0%, #1a1730 40%)` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff" }}>{sh.title}</p>
                      {sh.type==="feestje" && <span style={s.blueBadge}>Feestje</span>}
                      {isFirst && <span style={s.mintBadge}>Eerstvolgende</span>}
                      {urgentUnconfirmed && <span style={s.urgentBadge}>⏰ Bevestig snel!</span>}
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:"#e8e0ff", marginBottom:2 }}>{formatDateShort(sh.date)}</p>
                    <p style={{ fontSize:12, color:"#8b80b0" }}>{sh.start_time}–{sh.end_time}</p>
                    {sh.admin_note && <p style={{ fontSize:11, color:"#3b82f6", marginTop:4 }}>📌 {sh.admin_note}</p>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                    {isConfirmed
                      ? <span style={s.mintBadge}>✓ Bevestigd</span>
                      : <button style={{ ...s.btnYesSmall, opacity: loading===a.shift_id ? 0.5 : 1 }} disabled={loading===a.shift_id} onClick={() => handleConfirm(a.shift_id)}>✅ Bevestigen</button>
                    }
                    <button style={{ ...s.declineBtn, opacity: loading===a.shift_id ? 0.5 : 1 }} disabled={loading===a.shift_id} onClick={() => setDeclineModal(a)}>Afmelden</button>
                    <div style={{ display:"flex", gap:4 }}>
                      <a
                        href={`/api/shifts/${sh.id}/ical`}
                        style={{ ...s.agendaBtn, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4, fontSize:11 }}
                        onClick={(e) => { if (/Android/i.test(navigator.userAgent)) { e.preventDefault(); handleAgenda(sh); } }}
                      >📅</a>
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <button style={s.agendaBtn} onClick={() => handleShare(sh)} title="Deel dienst">↗</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Open diensten */}
      {claimable.length > 0 && (
        <>
          <p style={s.sectionTitle}>Open diensten</p>
          {claimable.map((shift) => (
            <div key={shift.id} style={{ ...s.card, borderLeft:`4px solid ${shiftColor(shift.type)}`, background:`linear-gradient(90deg, rgba(${shift.type==="feestje"?"59,130,246":"0,229,195"},0.04) 0%, #1a1730 40%)` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff" }}>{shift.title}</p>
                  <p style={{ fontSize:13, fontWeight:700, color:"#e8e0ff", marginBottom:2, marginTop:2 }}>{formatDateShort(shift.date)}</p>
                  <p style={{ fontSize:12, color:"#8b80b0" }}>{shift.start_time}–{shift.end_time}</p>
                  <p style={{ fontSize:11, color:"#8b80b0", marginTop:4 }}>
                    {shift.open_spots} open plek{shift.open_spots > 1 ? "ken" : ""}
                  </p>
                </div>
                <button style={{ ...s.claimBtn, opacity: loading===shift.id ? 0.5 : 1 }} disabled={loading===shift.id} onClick={() => setClaimModal(shift)}>
                  {loading===shift.id ? "..." : "Inschrijven"}
                </button>
              </div>
            </div>
          ))}
          <a href="/rooster" style={{display:"block", textAlign:"center", fontSize:12, color:"#00e5c3", textDecoration:"none", padding:"8px 0", opacity:0.8}}>
            Bekijk alle diensten op de roosterpagina →
          </a>
        </>
      )}

      {/* Admin berichten */}
      {adminMessages.length > 0 && (
        <>
          <p style={s.sectionTitle}>Berichten van admin</p>
          {adminMessages.map((msg) => (
            <div key={msg.id} style={s.card}>
              <div style={{ display:"flex", gap:10 }}>
                <span style={{ fontSize:20 }}>📢</span>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", marginBottom:4 }}>{msg.title}</p>
                  <p style={{ fontSize:12, color:"#8b80b0", lineHeight:1.5 }}>{msg.body}</p>
                  <p style={{ fontSize:11, color:"#8b80b0", marginTop:6 }}>
                    {new Date(msg.created_at).toLocaleDateString("nl-NL")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Claim modal */}
      {claimModal && (
        <div style={s.overlay} onClick={() => setClaimModal(null)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle}/>
            <h3 style={s.sheetTitle}>Inschrijven voor dienst</h3>
            <div style={{ background:"#221f38", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{claimModal.title}</p>
              <p style={{ fontSize:13, color:"#8b80b0", marginTop:4 }}>{formatDate(claimModal.date)} · {claimModal.start_time}–{claimModal.end_time}</p>
              {(claimModal as any).assignments?.filter((a: any) => a.status !== "declined").length > 0 && (
                <div style={{ marginTop:10 }}>
                  <p style={{ fontSize:11, color:"#8b80b0", marginBottom:6 }}>Al ingeroosterd:</p>
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
            <p style={{ fontSize:12, color:"#8b80b0", marginBottom:20, lineHeight:1.5 }}>
              Je ontvangt een e-mail bevestiging en herinneringen 2 weken en 1 week van tevoren.
            </p>
            <button style={s.btnPrimary} disabled={loading===claimModal.id} onClick={() => handleClaim(claimModal)}>
              {loading===claimModal.id ? "Bezig..." : "✅ Ja, ik schrijf me in!"}
            </button>
            <button style={{ ...s.btnSecondary, marginTop:8 }} onClick={() => setClaimModal(null)}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Decline modal */}
      {declineModal && (
        <div style={s.overlay} onClick={() => setDeclineModal(null)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle}/>
            <h3 style={s.sheetTitle}>Afmelden voor dienst</h3>
            <p style={{fontSize:16, fontWeight:700, color:"#f0eeff", marginBottom:4}}>{declineModal.shift?.title}</p>
            <p style={{fontSize:13, color:"#8b80b0", marginBottom:16}}>{declineModal.shift ? formatDate(declineModal.shift.date) : ""}</p>
            <p style={{ fontSize:13, color:"#8b80b0", marginBottom:16 }}>
              Alle andere tappers worden genotificeerd dat er een open plek is.
            </p>
            <div style={{ background:"#221f38", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:700, color:"#f0eeff" }}>{declineModal.shift?.title}</p>
              <p style={{ fontSize:13, color:"#8b80b0", marginTop:4 }}>
                {declineModal.shift ? formatDate(declineModal.shift.date) : ""} · {declineModal.shift?.start_time}–{declineModal.shift?.end_time}
              </p>
            </div>
            <button style={{ ...s.btnPrimary, background:"linear-gradient(135deg,#ff4f6d,#cc3355)", boxShadow:"0 4px 20px rgba(255,79,109,0.3)" }}
              disabled={loading===declineModal.shift_id}
              onClick={() => handleDecline(declineModal)}>
              {loading===declineModal.shift_id ? "Bezig..." : "🔴 Ja, ik meld me af"}
            </button>
            <button style={{ ...s.btnSecondary, marginTop:8 }} onClick={() => setDeclineModal(null)}>Toch niet</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:"20px 16px 100px" },
  errorBanner: { background:"rgba(255,79,109,0.1)", border:"1px solid #ff4f6d", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#ff4f6d", marginBottom:14, cursor:"pointer" },
  greeting: { fontSize:26, fontWeight:900, color:"#f0eeff", fontFamily:"'Exo 2',sans-serif", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
  adminBadge: { fontSize:11, fontWeight:700, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", borderRadius:20, padding:"2px 10px" },
  heroCard: { background:"linear-gradient(135deg,#1a1730,#221f38)", border:"1px solid #00e5c3", borderRadius:16, padding:18, marginBottom:12, boxShadow:"0 0 30px rgba(0,229,195,0.08)" },
  heroLabel: { fontSize:11, fontWeight:700, letterSpacing:2, color:"#00e5c3", textTransform:"uppercase", marginBottom:4 },
  heroTitle: { fontSize:20, fontWeight:900, color:"#f0eeff", fontFamily:"'Exo 2',sans-serif", margin:0 },
  heroSub: { fontSize:13, color:"#8b80b0", marginTop:2 },
  countdown: { fontFamily:"monospace", fontSize:34, fontWeight:700, color:"#00e5c3", lineHeight:1, margin:0 },
  confirmBox: { background:"#221f38", borderRadius:16, padding:12 },
  confirmedBanner: { background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:16, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center" },
  btnYes: { flex:1, padding:10, borderRadius:12, background:"rgba(0,229,195,0.1)", color:"#00e5c3", border:"1px solid #00e5c3", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },
  btnNo: { flex:1, padding:10, borderRadius:12, background:"rgba(255,79,109,0.1)", color:"#ff4f6d", border:"1px solid #ff4f6d", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },
  sectionTitle: { fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#8b80b0", margin:"20px 0 8px" },
  statRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 },
  statCard: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, textAlign:"center" },
  statVal: { fontFamily:"monospace", fontSize:30, fontWeight:700, color:"#00e5c3", margin:0 },
  statLabel: { fontSize:10, fontWeight:700, color:"#8b80b0", letterSpacing:1, textTransform:"uppercase", marginTop:4, margin:0 },
  card: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, marginBottom:10 },
  progressWrap: { background:"#2e2a4a", borderRadius:4, height:6, overflow:"hidden" },
  progressFill: { height:"100%", borderRadius:4, background:"linear-gradient(90deg,#00e5c3,#00b89c)", transition:"width 0.6s ease" },
  mintBadge: { fontSize:10, fontWeight:700, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", borderRadius:20, padding:"2px 8px" },
  blueBadge: { fontSize:10, fontWeight:700, background:"rgba(59,130,246,0.1)", border:"1px solid #3b82f6", color:"#3b82f6", borderRadius:20, padding:"2px 8px" },
  btnYesSmall: { fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:12, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", fontFamily:"'Exo 2',sans-serif", cursor:"pointer" },
  agendaBtn: { fontSize:14, padding:"4px 8px", borderRadius:8, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", cursor:"pointer" },
  declineBtn: { fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:12, background:"rgba(255,79,109,0.08)", border:"1px solid #ff4f6d", color:"#ff4f6d", cursor:"pointer", fontFamily:"'Exo 2',sans-serif" },
  claimBtn: { padding:"9px 14px", borderRadius:12, background:"linear-gradient(135deg,#00e5c3,#00b89c)", color:"#0f0d1a", border:"none", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:12, letterSpacing:1, cursor:"pointer", textTransform:"uppercase", flexShrink:0 },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" },
  sheet: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px", width:"100%", maxWidth:430 },
  sheetHandle: { width:48, height:5, background:"#3b2f6e", borderRadius:3, margin:"0 auto 20px" },
  urgentBadge: { fontSize:10, fontWeight:700, background:"rgba(255,181,71,0.12)", border:"1px solid #ffb547", color:"#ffb547", borderRadius:20, padding:"2px 8px" },
  sheetTitle: { fontSize:18, fontWeight:700, color:"#f0eeff", marginBottom:8, fontFamily:"'Exo 2',sans-serif" },
  btnPrimary: { width:"100%", padding:14, borderRadius:12, background:"linear-gradient(135deg,#00e5c3,#00b89c)", color:"#0f0d1a", fontFamily:"'Exo 2',sans-serif", fontSize:14, fontWeight:700, border:"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:1, display:"block" },
  btnSecondary: { width:"100%", padding:14, borderRadius:12, background:"#221f38", color:"#e8e0ff", fontFamily:"'Exo 2',sans-serif", fontSize:14, fontWeight:700, border:"1px solid #2e2a4a", cursor:"pointer", textTransform:"uppercase", letterSpacing:1, display:"block" },
};
