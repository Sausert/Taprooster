"use client";
import type { Shift } from "@/types";
import { formatDateShort as formatDate, formatTime } from "@/lib/dates";
import { useAdminShell } from "../AdminShellContext";
import { TimeSelect } from "./TimeSelect";
import styles from "@/styles/shared.module.css";

const s: Record<string, React.CSSProperties> = {
  addTapperBtn: { padding:"8px 12px", borderRadius:20, background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Exo 2', sans-serif" },
};

export function AdminShiftCard({ shift, source }: { shift: Shift & Record<string, unknown>; source: "concept" | "published" }) {
  const {
    editingShiftId, setEditingShiftId,
    shiftEditError, setShiftEditError,
    conceptShifts, setConceptShifts,
    published, setPublished,
    setAddTapperModal,
    handleRemoveTapper, handleDeleteShift, saveShiftEdit, updateShiftInList,
  } = useAdminShell();

  const isEditing = editingShiftId === shift.id;
  const setList = source === "concept" ? setConceptShifts : setPublished;
  const list = source === "concept" ? conceptShifts : published;
  const assigned = ((shift.assignments as any[]) || []).filter((a: any) => a.status !== "declined");
  const open = shift.max_tappers - assigned.length;
  const accentColor = shift.type === "feestje" ? "#f472b6" : "#00e5c3";

  return (
    <div style={{ background:"#1a1730", borderLeft:`4px solid ${accentColor}`, borderTop:"1px solid #2e2a4a", borderRight:"1px solid #2e2a4a", borderBottom:"1px solid #2e2a4a", borderRadius:16, padding:16, marginBottom:10 }}>
      {isEditing ? (
        <div>
          <label className={styles.label}>Naam dienst</label>
          <input className={styles.input} value={shift.title} onChange={e => updateShiftInList(shift.id, "title", e.target.value, list, setList)} />
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <div style={{ flex:1 }}><label className={styles.label}>Start</label><TimeSelect value={shift.start_time} onChange={v => updateShiftInList(shift.id, "start_time", v, list, setList)} /></div>
            <div style={{ flex:1 }}><label className={styles.label}>Eind</label><TimeSelect value={shift.end_time} onChange={v => updateShiftInList(shift.id, "end_time", v, list, setList)} /></div>
          </div>
          <label className={styles.label}>Max tappers</label>
          <input className={styles.input} style={{ width:80 }} type="number" min={1} max={20} value={shift.max_tappers} onChange={e => updateShiftInList(shift.id, "max_tappers", Number(e.target.value), list, setList)} />
          {shiftEditError && editingShiftId === shift.id && (
            <div style={{ background:"rgba(255,79,109,0.1)", border:"1px solid #ff4f6d", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#ff4f6d", marginBottom:8 }}>{shiftEditError}</div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <button className={styles.btnPrimary} style={{ flex:1, padding:"10px" }} onClick={() => saveShiftEdit(shift)}>Opslaan</button>
            <button className={styles.btnSecondary} style={{ flex:1, padding:"10px" }} onClick={() => { setEditingShiftId(null); setShiftEditError(null); }}>Annuleer</button>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
              <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff", margin:0 }}>{shift.title}</p>
              {shift.type === "feestje" && <span className={`${styles.badge} ${styles.badgeParty}`}>Feestje</span>}
              {shift.role === "bonnenkassa" && <span className={`${styles.badge} ${styles.badgeViolet}`}>Kassa</span>}
              {source === "concept" && <span className={`${styles.badge} ${styles.badgeMuted}`}>Concept</span>}
            </div>
            <p style={{ fontSize:12, color:"#b8b0d4", lineHeight:1.5 }}>{formatDate(shift.date)} · {formatTime(shift.start_time)}–{formatTime(shift.end_time)}</p>
            <p style={{ fontSize:12, fontWeight:700, color:open > 0 ? "#ffb547" : "#00e5c3", marginTop:2 }}>{assigned.length}/{shift.max_tappers}{open > 0 ? ` · ${open} open` : ""}</p>
            <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
              {assigned.map((a: any) => (
                <div key={a.user_id} style={{ display:"flex", alignItems:"center", gap:4, background:"#221f38", borderRadius:20, padding:"3px 8px 3px 10px", border:"1px solid #2e2a4a" }}>
                  <span style={{ fontSize:12, color:"#e8e0ff" }}>{a.profile?.full_name?.split(" ")[0] || "?"}</span>
                  <button className={styles.removePill} onClick={() => handleRemoveTapper(shift.id, a.user_id)}>×</button>
                </div>
              ))}
              {open > 0 && <button style={s.addTapperBtn} onClick={() => setAddTapperModal(shift as unknown as import("@/types").Shift)}>+ Tapper</button>}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginLeft:10 }}>
            <button className={styles.iconBtn} aria-label="Bewerken" onClick={() => setEditingShiftId(shift.id)}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} aria-label="Verwijderen" onClick={() => handleDeleteShift(shift.id, source)}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
