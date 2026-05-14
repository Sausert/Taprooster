"use client";
import type { Shift } from "@/types";
import { formatDateShort as formatDate } from "@/lib/dates";
import { useAdminShell } from "../AdminShellContext";
import styles from "@/styles/shared.module.css";

const s: Record<string, React.CSSProperties> = {
  iconBtn: { background:"#221f38", border:"1px solid #2e2a4a", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14, color:"#e8e0ff" },
  addTapperBtn: { padding:"4px 10px", borderRadius:20, background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Exo 2', sans-serif" },
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
  const accentColor = shift.type === "feestje" ? "#a896ff" : "#00e5c3";

  return (
    <div style={{ background:"#1a1730", borderLeft:`3px solid ${accentColor}`, borderTop:"1px solid #2e2a4a", borderRight:"1px solid #2e2a4a", borderBottom:"1px solid #2e2a4a", borderRadius:16, padding:16, marginBottom:10 }}>
      {isEditing ? (
        <div>
          <label className={styles.label}>Naam dienst</label>
          <input className={styles.input} value={shift.title} onChange={e => updateShiftInList(shift.id, "title", e.target.value, list, setList)} />
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <div style={{ flex:1 }}><label className={styles.label}>Start</label><input className={styles.input} style={{ marginBottom:0 }} value={shift.start_time} onChange={e => updateShiftInList(shift.id, "start_time", e.target.value, list, setList)} /></div>
            <div style={{ flex:1 }}><label className={styles.label}>Eind</label><input className={styles.input} style={{ marginBottom:0 }} value={shift.end_time} onChange={e => updateShiftInList(shift.id, "end_time", e.target.value, list, setList)} /></div>
          </div>
          <label className={styles.label}>Max tappers</label>
          <input className={styles.input} style={{ width:80 }} type="number" min={1} max={20} value={shift.max_tappers} onChange={e => updateShiftInList(shift.id, "max_tappers", Number(e.target.value), list, setList)} />
          <label className={styles.label}>Notitie</label>
          <input className={styles.input} value={(shift.admin_note as string) || ""} onChange={e => updateShiftInList(shift.id, "admin_note", e.target.value, list, setList)} placeholder="Optionele notitie..." />
          {shiftEditError && editingShiftId === shift.id && (
            <div style={{ background:"rgba(255,79,109,0.1)", border:"1px solid #ff4f6d", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#ff4f6d", marginBottom:8 }}>❌ {shiftEditError}</div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <button className={styles.btnPrimary} style={{ flex:1, padding:"10px" }} onClick={() => saveShiftEdit(shift)}>💾 Opslaan</button>
            <button className={styles.btnSecondary} style={{ flex:1, padding:"10px" }} onClick={() => { setEditingShiftId(null); setShiftEditError(null); }}>Annuleer</button>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
              <p style={{ fontSize:14, fontWeight:700, color:"#f0eeff" }}>{shift.title}</p>
              {shift.type === "feestje" && <span className={`${styles.badge} ${styles.badgeBlue}`}>Feestje</span>}
              {shift.role === "bonnenkassa" && <span className={`${styles.badge} ${styles.badgeViolet}`}>Kassa</span>}
            </div>
            <p style={{ fontSize:12, color:"#8b80b0" }}>{formatDate(shift.date)} · {shift.start_time}–{shift.end_time}</p>
            <p style={{ fontSize:11, color:open > 0 ? "#ffb547" : "#00e5c3", marginTop:2 }}>{assigned.length}/{shift.max_tappers}{open > 0 ? ` · ${open} open` : ""}</p>
            {shift.admin_note && <p style={{ fontSize:11, color:"#8b80b0", marginTop:4 }}>📌 {shift.admin_note as string}</p>}
            <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
              {assigned.map((a: any) => (
                <div key={a.user_id} style={{ display:"flex", alignItems:"center", gap:4, background:"#221f38", borderRadius:20, padding:"3px 8px 3px 10px", border:"1px solid #2e2a4a" }}>
                  <span style={{ fontSize:12, color:"#e8e0ff" }}>{a.profile?.full_name?.split(" ")[0] || "?"}</span>
                  <button style={{ background:"none", border:"none", color:"#ff4f6d", cursor:"pointer", fontSize:13, padding:"0 2px", lineHeight:1 }} onClick={() => handleRemoveTapper(shift.id, a.user_id)}>✕</button>
                </div>
              ))}
              {open > 0 && <button style={s.addTapperBtn} onClick={() => setAddTapperModal(shift as unknown as import("@/types").Shift)}>+ Tapper</button>}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginLeft:10 }}>
            <button style={s.iconBtn} onClick={() => setEditingShiftId(shift.id)}>✏️</button>
            <button style={{ ...s.iconBtn, color:"#ff4f6d" }} onClick={() => handleDeleteShift(shift.id, source)}>🗑</button>
          </div>
        </div>
      )}
    </div>
  );
}
