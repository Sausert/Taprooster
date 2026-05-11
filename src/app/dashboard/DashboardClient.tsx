"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";

interface Props {
  profile: Profile | null;
  myUpcoming: any[];
  claimableShifts: any[];
  tapsThisYear: number;
  myRank: number;
  adminMessages: any[];
}

export default function DashboardClient({ profile, myUpcoming, claimableShifts, tapsThisYear, myRank, adminMessages }: Props) {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState(myUpcoming);
  const [claimable, setClaimable] = useState(claimableShifts);
  const [claimModal, setClaimModal] = useState<any | null>(null);
  const [declineModal, setDeclineModal] = useState<any | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] || "Tapper";
  const target = profile?.preferred_frequency || 20;
  const pct = Math.min(100, Math.round((tapsThisYear / target) * 100));

  // Eerstvolgende dienst
  const nextAssignment = upcoming[0];
  const nextShift = nextAssignment?.shift;
  const daysUntilNext = nextShift
    ? Math.ceil((new Date(nextShift.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  }
  function formatDateShort(d: string) {
    return new Date(d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  }
  function formatTime(s: string, e: string) { return `${s}–${e}`; }

  async function handleConfirm(shiftId: string) {
    setLoading(shiftId);
    await fetch(`/api/shifts/${shiftId}/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    setConfirmedIds(p => [...p, shiftId]);
    setLoading(null);
  }

  async function handleClaim(shift: any) {
    setLoading(shift.id);
    const res = await fetch(`/api/shifts/${shift.id}/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim" }),
    });
    if (res.ok) {
      setClaimable(cs => cs.filter(s => s.id !== shift.id));
      // Voeg toe aan upcoming lijst
      setUpcoming(u => [...u, {
        shift_id: shift.id,
        status: "assigned",
        shift: { ...shift, date: shift.date, start_time: shift.start_time, end_time: shift.end_time, title: shift.title },
      }].sort((a, b) => new Date(a.shift.date).getTime() - new Date(b.shift.date).getTime()));
    }
    setClaimModal(null);
    setLoading(null);
  }

  async function handleDecline(assignment: any) {
    setLoading(assignment.shift_id);
    const res = await fetch(`/api/shifts/${assignment.shift_id}/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    if (res.ok) {
      setUpcoming(u => u.filter(a => a.shift_id !== assignment.shift_id));
    }
    setDeclineModal(null);
    setLoading(null);
  }

  const shiftTypeColor = (type: string) => type === "feestje" ? "#ffb547" : "#00e5c3";

  return (
    <div style={s.page}>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "#8b80b0", marginBottom: 4 }}>Welkom terug,</p>
        <h1 style={s.greeting}>
          {firstName} 👋
          {profile?.role === "admin" && <span style={s.adminBadge}>⚡ Admin</span>}
        </h1>
      </div>

      {/* Eerstvolgende dienst hero */}
      {nextShift ? (
        <div style={s.heroCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <p style={s.heroLabel}>Volgende dienst</p>
              <h2 style={s.heroTitle}>{nextShift.title}</h2>
              <p style={s.heroSub}>{formatDate(nextShift.date)} · {formatTime(nextShift.start_time, nextShift.end_time)}</p>
            </div>
            {daysUntilNext !== null && (
              <div style={{ textAlign: "center", minWidth: 52 }}>
                <p style={s.countdown}>{daysUntilNext}</p>
                <p style={{ fontSize: 10, color: "#8b80b0", letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>dagen</p>
              </div>
            )}
          </div>
          {confirmedIds.includes(nextAssignment.shift_id) || nextAssignment.status === "confirmed" ? (
            <div style={s.confirmedBanner}>✅ Bevestigd! Tot dan 🍺</div>
          ) : (
            <div style={s.confirmBox}>
              <p style={{ fontSize: 12, color: "#8b80b0", marginBottom: 8 }}>Ben jij erbij?</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btnYes} disabled={loading === nextAssignment.shift_id} onClick={() => handleConfirm(nextAssignment.shift_id)}>✅ Ik ben erbij</button>
                <button style={s.btnNo} onClick={() => setDeclineModal(nextAssignment)}>🔴 Ik kan niet</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...s.card, textAlign: "center", padding: "24px" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🍺</p>
          <p style={{ color: "#8b80b0", fontSize: 14 }}>Geen diensten ingepland de komende 30 dagen.</p>
        </div>
      )}

      {/* Stats */}
      <p style={s.sectionTitle}>Jouw statistieken</p>
      <div style={s.statRow}>
        <div style={s.statCard}><p style={s.statVal}>{tapsThisYear}</p><p style={s.statLabel}>Getapt dit jaar</p></div>
        <div style={s.statCard}><p style={s.statVal}>{Math.max(0, target - tapsThisYear)}</p><p style={s.statLabel}>Nog te gaan</p></div>
      </div>
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#8b80b0" }}>Voortgang naar doel ({target}x)</span>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#00e5c3" }}>{pct}%</span>
        </div>
        <div style={s.progressWrap}><div style={{ ...s.progressFill, width: `${pct}%` }} /></div>
        {myRank > 0 && <p style={{ fontSize: 11, color: "#8b80b0", marginTop: 6 }}>Je staat op plek <strong style={{ color: "#00e5c3" }}>#{myRank}</strong> dit jaar 🏆</p>}
      </div>

      {/* Mijn diensten komende 30 dagen */}
      {upcoming.length > 0 && (
        <>
          <p style={s.sectionTitle}>Mijn diensten — komende 30 dagen</p>
          {upcoming.map((a: any) => {
            const sh = a.shift;
            if (!sh) return null;
            const isFirst = a === nextAssignment;
            const isConfirmed = confirmedIds.includes(a.shift_id) || a.status === "confirmed";
            return (
              <div key={a.shift_id} style={{ ...s.card, borderLeft: `3px solid ${shiftTypeColor(sh.type)}`, opacity: isFirst ? 1 : 0.9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#f0eeff" }}>{sh.title}</p>
                      {sh.type === "feestje" && <span style={s.warnBadge}>Feestje</span>}
                      {isFirst && <span style={s.mintBadge}>Eerstvolgende</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "#8b80b0" }}>{formatDateShort(sh.date)} · {formatTime(sh.start_time, sh.end_time)}</p>
                    {sh.admin_note && <p style={{ fontSize: 11, color: "#ffb547", marginTop: 4 }}>📌 {sh.admin_note}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    {isConfirmed
                      ? <span style={s.mintBadge}>✓ Bevestigd</span>
                      : <button style={s.btnYesSmall} disabled={loading === a.shift_id} onClick={() => handleConfirm(a.shift_id)}>✅ Bevestigen</button>
                    }
                    <button
                      style={s.declineBtn}
                      disabled={loading === a.shift_id}
                      onClick={() => setDeclineModal(a)}>
                      Afmelden
                    </button>
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
          {claimable.map((shift: any) => (
            <div key={shift.id} style={{ ...s.card, borderLeft: `3px solid ${shiftTypeColor(shift.type)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f0eeff" }}>{shift.title}</p>
                  <p style={{ fontSize: 12, color: "#8b80b0", marginTop: 2 }}>
                    {formatDateShort(shift.date)} · {shift.start_time}–{shift.end_time}
                  </p>
                  <p style={{ fontSize: 11, color: "#8b80b0", marginTop: 4 }}>
                    {shift.open_spots} open plek{shift.open_spots > 1 ? "ken" : ""}
                  </p>
                </div>
                <button style={s.claimBtn} disabled={loading === shift.id} onClick={() => setClaimModal(shift)}>
                  {loading === shift.id ? "..." : "Inschrijven"}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Admin berichten */}
      {adminMessages.length > 0 && (
        <>
          <p style={s.sectionTitle}>Berichten van admin</p>
          {adminMessages.map((msg: any) => (
            <div key={msg.id} style={s.card}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 20 }}>📢</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#f0eeff", marginBottom: 4 }}>{msg.title}</p>
                  <p style={{ fontSize: 12, color: "#8b80b0", lineHeight: 1.5 }}>{msg.body}</p>
                  <p style={{ fontSize: 11, color: "#8b80b0", marginTop: 6 }}>{new Date(msg.created_at).toLocaleDateString("nl-NL")}</p>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Claim modal ── */}
      {claimModal && (
        <div style={s.overlay} onClick={() => setClaimModal(null)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <h3 style={s.sheetTitle}>Inschrijven voor dienst</h3>
            <p style={{ fontSize: 13, color: "#8b80b0", marginBottom: 16 }}>Bevestig jouw aanmelding voor deze dienst.</p>
            <div style={s.card}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#f0eeff", marginBottom: 4 }}>{claimModal.title}</p>
              <p style={{ fontSize: 13, color: "#8b80b0" }}>{formatDate(claimModal.date)} · {claimModal.start_time}–{claimModal.end_time}</p>
            </div>
            <p style={{ fontSize: 12, color: "#8b80b0", marginBottom: 20, lineHeight: 1.5 }}>
              Je ontvangt een bevestiging per e-mail en herinneringen 2 weken en 1 week van tevoren.
            </p>
            <button style={s.btnPrimary} disabled={loading === claimModal.id} onClick={() => handleClaim(claimModal)}>
              {loading === claimModal.id ? "Bezig..." : "✅ Ja, ik schrijf me in!"}
            </button>
            <button style={{ ...s.btnSecondary, marginTop: 8 }} onClick={() => setClaimModal(null)}>Annuleren</button>
          </div>
        </div>
      )}

      {/* ── Afmeld modal ── */}
      {declineModal && (
        <div style={s.overlay} onClick={() => setDeclineModal(null)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <h3 style={s.sheetTitle}>Afmelden voor dienst</h3>
            <p style={{ fontSize: 13, color: "#8b80b0", marginBottom: 16 }}>
              Weet je zeker dat je je wilt afmelden? Alle andere tappers worden genotificeerd dat er een open plek is.
            </p>
            <div style={s.card}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#f0eeff", marginBottom: 4 }}>{declineModal.shift?.title}</p>
              <p style={{ fontSize: 13, color: "#8b80b0" }}>
                {declineModal.shift ? formatDate(declineModal.shift.date) : ""} · {declineModal.shift?.start_time}–{declineModal.shift?.end_time}
              </p>
            </div>
            <button
              style={{ ...s.btnPrimary, background: "linear-gradient(135deg, #ff4f6d, #cc3355)", boxShadow: "0 4px 20px rgba(255,79,109,0.3)" }}
              disabled={loading === declineModal.shift_id}
              onClick={() => handleDecline(declineModal)}>
              {loading === declineModal.shift_id ? "Bezig..." : "🔴 Ja, ik meld me af"}
            </button>
            <button style={{ ...s.btnSecondary, marginTop: 8 }} onClick={() => setDeclineModal(null)}>Toch niet</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: "20px 16px 100px" },
  greeting: { fontSize: 26, fontWeight: 900, color: "#f0eeff", fontFamily: "'Exo 2', sans-serif", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  adminBadge: { fontSize: 11, fontWeight: 700, background: "rgba(0,229,195,0.1)", border: "1px solid #00e5c3", color: "#00e5c3", borderRadius: 20, padding: "2px 10px", letterSpacing: 0.5 },
  heroCard: { background: "linear-gradient(135deg, #1a1730, #221f38)", border: "1px solid #00e5c3", borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: "0 0 30px rgba(0,229,195,0.08)" },
  heroLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#00e5c3", textTransform: "uppercase", marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: 900, color: "#f0eeff", fontFamily: "'Exo 2', sans-serif", margin: 0 },
  heroSub: { fontSize: 13, color: "#8b80b0", marginTop: 2 },
  countdown: { fontFamily: "monospace", fontSize: 34, fontWeight: 700, color: "#00e5c3", lineHeight: 1, margin: 0 },
  confirmBox: { background: "#221f38", borderRadius: 10, padding: 12 },
  confirmedBanner: { background: "rgba(0,229,195,0.08)", border: "1px solid #00e5c3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#00e5c3", fontWeight: 700, textAlign: "center" },
  btnYes: { flex: 1, padding: 10, borderRadius: 10, background: "rgba(0,229,195,0.1)", color: "#00e5c3", border: "1px solid #00e5c3", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnNo: { flex: 1, padding: 10, borderRadius: 10, background: "rgba(255,79,109,0.1)", color: "#ff4f6d", border: "1px solid #ff4f6d", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  sectionTitle: { fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#8b80b0", margin: "20px 0 10px" },
  statRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  statCard: { background: "#1a1730", border: "1px solid #2e2a4a", borderRadius: 14, padding: 16, textAlign: "center" },
  statVal: { fontFamily: "monospace", fontSize: 30, fontWeight: 700, color: "#00e5c3", margin: 0 },
  statLabel: { fontSize: 10, fontWeight: 700, color: "#8b80b0", letterSpacing: 1, textTransform: "uppercase", marginTop: 4, margin: 0 },
  card: { background: "#1a1730", border: "1px solid #2e2a4a", borderRadius: 16, padding: 16, marginBottom: 10 },
  progressWrap: { background: "#2e2a4a", borderRadius: 4, height: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #00e5c3, #00b89c)", transition: "width 0.6s ease" },
  mintBadge: { fontSize: 10, fontWeight: 700, background: "rgba(0,229,195,0.1)", border: "1px solid #00e5c3", color: "#00e5c3", borderRadius: 20, padding: "2px 8px" },
  warnBadge: { fontSize: 10, fontWeight: 700, background: "rgba(255,181,71,0.1)", border: "1px solid #ffb547", color: "#ffb547", borderRadius: 20, padding: "2px 8px" },
  btnYesSmall: { fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, background: 'rgba(0,229,195,0.1)', border: '1px solid #00e5c3', color: '#00e5c3', fontFamily: "'Exo 2', sans-serif", cursor: 'pointer' },
  declineBtn: { fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, background: "rgba(255,79,109,0.08)", border: "1px solid #ff4f6d", color: "#ff4f6d", cursor: "pointer", fontFamily: "'Exo 2', sans-serif" },
  claimBtn: { padding: "9px 14px", borderRadius: 10, background: "linear-gradient(135deg, #00e5c3, #00b89c)", color: "#0f0d1a", border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: "pointer", textTransform: "uppercase", flexShrink: 0 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  sheet: { background: "#1a1730", border: "1px solid #2e2a4a", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 430 },
  sheetHandle: { width: 36, height: 4, background: "#2e2a4a", borderRadius: 2, margin: "0 auto 20px" },
  sheetTitle: { fontSize: 18, fontWeight: 700, color: "#f0eeff", marginBottom: 8, fontFamily: "'Exo 2', sans-serif" },
  btnPrimary: { width: "100%", padding: 14, borderRadius: 12, background: "linear-gradient(135deg, #00e5c3, #00b89c)", color: "#0f0d1a", fontFamily: "'Exo 2', sans-serif", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, boxShadow: "0 4px 20px rgba(0,229,195,0.3)", display: "block" },
  btnSecondary: { width: "100%", padding: 14, borderRadius: 12, background: "#221f38", color: "#e8e0ff", fontFamily: "'Exo 2', sans-serif", fontSize: 15, fontWeight: 700, border: "1px solid #2e2a4a", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, display: "block" },
};
