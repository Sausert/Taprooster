"use client";
import { useState } from "react";
import { formatDateShort as formatDate } from "@/lib/dates";
import { useAdminShell, type LeaderboardEntry } from "../AdminShellContext";
import styles from "@/styles/shared.module.css";

const MONTH_NAMES_FULL = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

function TapBarChart({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const max = Math.max(...leaderboard.map(l => l.taps_this_year || 0), 1);
  return (
    <div style={{ marginTop:8 }}>
      {leaderboard.slice(0, 10).map(lb => {
        const pct = Math.round(((lb.taps_this_year || 0) / max) * 100);
        const yearTarget = (lb.target || 1) * 12;
        const goalPct = Math.min(100, Math.round(((lb.taps_this_year || 0) / yearTarget) * 100));
        return (
          <div key={lb.id} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:12, color:"#e8e0ff", fontWeight:600 }}>{lb.full_name?.split(" ")[0]}</span>
              <span style={{ fontSize:12, fontFamily:"monospace", color:"#00e5c3" }}>
                {lb.taps_this_year || 0}x <span style={{ color:"#8b80b0", fontSize:10 }}>({goalPct}% v/doel)</span>
              </span>
            </div>
            <div style={{ background:"#2e2a4a", borderRadius:6, height:8, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:6, width:`${pct}%`, background: pct > 75 ? "linear-gradient(90deg,#00e5c3,#00b89c)" : pct > 40 ? "linear-gradient(90deg,#ffb547,#e09030)" : "linear-gradient(90deg,#5a4a9e,#3b2f6e)", transition:"width 0.6s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  statGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 },
  statCard: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, textAlign:"center" },
  statVal: { fontFamily:"monospace", fontSize:30, fontWeight:700, margin:0 },
  statLabel: { fontSize:10, color:"#8b80b0", letterSpacing:1, textTransform:"uppercase", marginTop:4, margin:0 },
  healthRow: { display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #2e2a4a" },
  addTapperBtn: { padding:"4px 10px", borderRadius:20, background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Exo 2', sans-serif" },
};

export function HealthTab() {
  const { shifts, leaderboard, setAddTapperModal } = useAdminShell();
  const [statusMonthFilter, setStatusMonthFilter] = useState("");
  const now = new Date();

  const underfilled = shifts.filter(s => ((s.assignments || []) as any[]).filter((a: any) => a.status !== "declined").length < s.max_tappers);
  const unconfirmed = shifts.filter(s => ((s.assignments || []) as any[]).some((a: any) => a.status === "assigned"));

  function getHealthColor(shift: any) {
    const n = ((shift.assignments || []) as any[]).filter((a: any) => a.status !== "declined").length;
    return n >= shift.max_tappers ? "#00e5c3" : n >= shift.max_tappers / 2 ? "#ffb547" : "#ff4f6d";
  }

  return (
    <>
      <div style={s.statGrid}>
        <div style={s.statCard}><p style={{ ...s.statVal, color:"#ff4f6d" }}>{underfilled.length}</p><p style={s.statLabel}>Onderbezet</p></div>
        <div style={s.statCard}><p style={{ ...s.statVal, color:"#ffb547" }}>{unconfirmed.length}</p><p style={s.statLabel}>Onbevestigd</p></div>
      </div>

      <p className={styles.sectionTitle}>Dienststatus</p>
      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
        <button onClick={() => setStatusMonthFilter("")} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", background:statusMonthFilter === "" ? "rgba(0,229,195,0.1)" : "#221f38", color:statusMonthFilter === "" ? "#00e5c3" : "#8b80b0", border:`1px solid ${statusMonthFilter === "" ? "#00e5c3" : "#2e2a4a"}` }}>Alles</button>
        {MONTH_NAMES_FULL.map((name, idx) => {
          const key = `${now.getFullYear()}-${String(idx + 1).padStart(2, "0")}`;
          if (!shifts.some(s => s.date?.startsWith(key))) return null;
          return (
            <button key={idx} onClick={() => setStatusMonthFilter(key)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", background:statusMonthFilter === key ? "rgba(0,229,195,0.1)" : "#221f38", color:statusMonthFilter === key ? "#00e5c3" : "#8b80b0", border:`1px solid ${statusMonthFilter === key ? "#00e5c3" : "#2e2a4a"}` }}>
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>

      <div className={styles.card}>
        {shifts.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 20px" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
            <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen diensten</p>
            <p style={{ fontSize:12, color:"#8b80b0", marginTop:4 }}>Er zijn nog geen diensten aangemaakt.</p>
          </div>
        )}
        {shifts.filter(s => !statusMonthFilter || s.date?.startsWith(statusMonthFilter)).map(shift => {
          const color = getHealthColor(shift);
          const assigned = ((shift.assignments || []) as any[]).filter((a: any) => a.status !== "declined").length;
          const confirmed = ((shift.assignments || []) as any[]).filter((a: any) => a.status === "confirmed").length;
          const unresponsive = ((shift.assignments || []) as any[]).filter((a: any) => a.status === "assigned").map((a: any) => a.profile?.full_name?.split(" ")[0] || "?");
          return (
            <div key={shift.id} style={{ ...s.healthRow, flexDirection:"column", alignItems:"stretch", gap:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:color, boxShadow:`0 0 6px ${color}` }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:"#e8e0ff" }}>{formatDate(shift.date)} — {shift.title}</p>
                  <p style={{ fontSize:11, color }}>{assigned}/{shift.max_tappers} bezet · {confirmed} bevestigd</p>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {assigned < shift.max_tappers && <span className={`${styles.badge} ${styles.badgeRed}`}>{shift.max_tappers - assigned} open</span>}
                  {assigned < shift.max_tappers && <button style={s.addTapperBtn} onClick={() => setAddTapperModal(shift)}>+ Tapper</button>}
                </div>
              </div>
              {unresponsive.length > 0 && (
                <div style={{ paddingLeft:20, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ fontSize:10, color:"#ffb547" }}>⏳ Niet bevestigd:</span>
                  {unresponsive.map((name, i) => (
                    <span key={i} style={{ fontSize:11, padding:"1px 8px", borderRadius:20, background:"rgba(255,181,71,0.1)", border:"1px solid rgba(255,181,71,0.3)", color:"#ffb547" }}>{name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={styles.sectionTitle}>🍺 Tapscore dit jaar</p>
      <div className={styles.card}><TapBarChart leaderboard={leaderboard} /></div>
    </>
  );
}
