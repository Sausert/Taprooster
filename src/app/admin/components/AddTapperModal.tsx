"use client";
import { formatDateShort as formatDate } from "@/lib/dates";
import { useAdminShell } from "../AdminShellContext";
import styles from "@/styles/shared.module.css";

export function AddTapperModal() {
  const {
    profiles,
    addTapperModal, setAddTapperModal,
    tapperSearchModal, setTapperSearchModal,
    addingTapper,
    handleAddTapper,
  } = useAdminShell();

  if (!addTapperModal) return null;

  const filteredProfiles = profiles.filter(p => {
    if (!p.full_name?.toLowerCase().includes(tapperSearchModal.toLowerCase())) return false;
    const shiftDate = addTapperModal.date;
    if (!shiftDate) return true;
    const monthIdx = new Date(
      shiftDate.split("-").map(Number)[0],
      shiftDate.split("-").map(Number)[1] - 1,
      1,
    ).getMonth();
    if ((p.unavailable_months || []).includes(monthIdx)) return false;
    const [y, m, d] = shiftDate.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const dayMap: Record<number, string> = { 3:"wednesday", 5:"friday", 6:"saturday" };
    const shiftDay = dayMap[dow];
    if (shiftDay && (p.preferred_days || []).length > 0 && !(p.preferred_days || []).includes(shiftDay as "wednesday" | "friday" | "saturday")) return false;
    if (addTapperModal.type === "feestje" && !p.wants_parties) return false;
    return true;
  });

  const assignments = (addTapperModal as any).assignments || [];

  return (
    <div className={styles.overlay} onClick={() => { setAddTapperModal(null); setTapperSearchModal(""); }}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <p className={styles.sheetTitle}>Tapper toevoegen</p>
        <p style={{ fontSize:13, color:"#8b80b0", marginBottom:12 }}>{addTapperModal.title} · {formatDate(addTapperModal.date)}</p>
        <input className={styles.input} placeholder="🔍 Zoek tapper..." value={tapperSearchModal} onChange={e => setTapperSearchModal(e.target.value)} autoFocus />
        <div style={{ maxHeight:280, overflowY:"auto" }}>
          {filteredProfiles
            .filter(p => !assignments.some((a: any) => a.user_id === p.id && a.status !== "declined"))
            .map(p => (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #2e2a4a" }}>
                <div className={styles.avatar}>{p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:600, color:"#e8e0ff" }}>{p.full_name}</p>
                  <p style={{ fontSize:11, color:"#8b80b0" }}>{p.email}</p>
                </div>
                <button
                  className={styles.btnPrimary}
                  style={{ width:"auto", padding:"8px 14px", fontSize:12 }}
                  disabled={addingTapper === p.id}
                  onClick={() => handleAddTapper(addTapperModal.id, p.id)}
                >
                  {addingTapper === p.id ? "..." : "+ Voeg toe"}
                </button>
              </div>
            ))}
        </div>
        <button className={styles.btnSecondary} style={{ marginTop:12 }} onClick={() => { setAddTapperModal(null); setTapperSearchModal(""); }}>Sluiten</button>
      </div>
    </div>
  );
}
