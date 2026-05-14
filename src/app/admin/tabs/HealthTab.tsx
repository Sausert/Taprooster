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
  const { shifts, conceptShifts, leaderboard, setAddTapperModal } = useAdminShell();
  const [statusMonthFilter, setStatusMonthFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "underfilled" | "unconfirmed">("all");
  const now = new Date();

  const allShifts = [...shifts, ...conceptShifts].sort((a, b) => a.date.localeCompare(b.date));

  const underfilled = allShifts.filter(s => ((s.assignments || []) as any[]).filter((a: any) => a.status !== "declined").length < s.max_tappers);
  const unconfirmed = allShifts.filter(s => ((s.assignments || []) as any[]).some((a: any) => a.status === "assigned"));

  function getHealthColor(shift: any) {
    const n = ((shift.assignments || []) as any[]).filter((a: any) => a.status !== "declined").length;
    return n >= shift.max_tappers ? "#00e5c3" : n >= shift.max_tappers / 2 ? "#ffb547" : "#ff4f6d";
  }

  return (
    <>
      <div style={s.statGrid}>
        <div
          style={{ ...s.statCard, cursor:"pointer", borderColor: healthFilter === "underfilled" ? "#ff4f6d" : "#2e2a4a", transition:"border-color 0.15s" }}
          onClick={() => setHealthFilter(f => f === "underfilled" ? "all" : "underfilled")}
          title="Klik om te filteren op onderbezette diensten"
        >
          <p style={{ ...s.statVal, color:"#ff4f6d" }}>{underfilled.length}</p>
          <p style={s.statLabel}>Onderbezet {healthFilter === "underfilled" && "▾"}</p>
        </div>
        <div
          style={{ ...s.statCard, cursor:"pointer", borderColor: healthFilter === "unconfirmed" ? "#ffb547" : "#2e2a4a", transition:"border-color 0.15s" }}
          onClick={() => setHealthFilter(f => f === "unconfirmed" ? "all" : "unconfirmed")}
          title="Klik om te filteren op onbevestigde diensten"
        >
          <p style={{ ...s.statVal, color:"#ffb547" }}>{unconfirmed.length}</p>
          <p style={s.statLabel}>Onbevestigd {healthFilter === "unconfirmed" && "▾"}</p>
        </div>
      </div>

      <p className={styles.sectionTitle}>Dienststatus</p>
      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
        <button onClick={() => setStatusMonthFilter("")} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", background:statusMonthFilter === "" ? "rgba(0,229,195,0.1)" : "#221f38", color:statusMonthFilter === "" ? "#00e5c3" : "#8b80b0", border:`1px solid ${statusMonthFilter === "" ? "#00e5c3" : "#2e2a4a"}` }}>Alles</button>
        {[...new Set(allShifts.map(s => s.date?.slice(0, 7)).filter(Boolean))].sort().map(key => {
          if (!key) return null;
          const [year, month] = key.split("-");
          const monthIdx = Number(month) - 1;
          const yearSuffix = year !== String(now.getFullYear()) ? ` '${year.slice(2)}` : "";
          return (
            <button key={key} onClick={() => setStatusMonthFilter(key)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", background:statusMonthFilter === key ? "rgba(0,229,195,0.1)" : "#221f38", color:statusMonthFilter === key ? "#00e5c3" : "#8b80b0", border:`1px solid ${statusMonthFilter === key ? "#00e5c3" : "#2e2a4a"}` }}>
              {MONTH_NAMES_FULL[monthIdx].slice(0, 3)}{yearSuffix}
            </button>
          );
        })}
      </div>

      {healthFilter !== "all" && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ fontSize:12, color: healthFilter === "underfilled" ? "#ff4f6d" : "#ffb547" }}>
            Filter: {healthFilter === "underfilled" ? "Onderbezet" : "Onbevestigd"}
          </span>
          <button onClick={() => setHealthFilter("all")} style={{ padding:"2px 10px", borderRadius:20, background:"none", border:`1px solid ${healthFilter === "underfilled" ? "#ff4f6d" : "#ffb547"}`, color: healthFilter === "underfilled" ? "#ff4f6d" : "#ffb547", fontSize:11, cursor:"pointer" }}>✕ Wis filter</button>
        </div>
      )}
      <div className={styles.card}>
        {allShifts.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 20px" }}>
            <div style={{ fontSize:40, marginBottom:8 }}>📅</div>
            <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff", margin:0 }}>Geen diensten</p>
            <p style={{ fontSize:12, color:"#8b80b0", marginTop:4 }}>Er zijn nog geen diensten aangemaakt.</p>
          </div>
        )}
        {allShifts
          .filter(s => {
            if (healthFilter === "underfilled") return underfilled.includes(s);
            if (healthFilter === "unconfirmed") return unconfirmed.includes(s);
            return true;
          })
          .filter(s => !statusMonthFilter || s.date?.startsWith(statusMonthFilter))
          .map(shift => {
          const isConcept = (shift as any).status === "concept";
          const color = getHealthColor(shift);
          const assigned = ((shift.assignments || []) as any[]).filter((a: any) => a.status !== "declined").length;
          const confirmed = ((shift.assignments || []) as any[]).filter((a: any) => a.status === "confirmed").length;
          const unresponsive = ((shift.assignments || []) as any[]).filter((a: any) => a.status === "assigned").map((a: any) => a.profile?.full_name?.split(" ")[0] || "?");
          return (
            <div key={shift.id} style={{ ...s.healthRow, flexDirection:"column", alignItems:"stretch", gap:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:color, boxShadow:`0 0 6px ${color}` }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:"#e8e0ff", margin:0 }}>{formatDate(shift.date)} — {shift.title}</p>
                    {isConcept && <span className={`${styles.badge} ${styles.badgeAmber}`}>Concept</span>}
                  </div>
                  <p style={{ fontSize:11, color, margin:0 }}>{assigned}/{shift.max_tappers} bezet · {confirmed} bevestigd</p>
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
