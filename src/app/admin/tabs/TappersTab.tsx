"use client";
import { useState } from "react";
import type { Profile } from "@/types";
import { useAdminShell } from "../AdminShellContext";
import styles from "@/styles/shared.module.css";

const MONTH_NAMES_SHORT = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

const s: Record<string, React.CSSProperties> = {
  editBtn: { fontSize:11, padding:"4px 10px", borderRadius:8, background:"#221f38", border:"1px solid #2e2a4a", color:"#e8e0ff", cursor:"pointer", fontFamily:"'Exo 2', sans-serif", fontWeight:700 },
};

export function TappersTab() {
  const { profiles, setProfiles, leaderboard } = useAdminShell();
  const [tapperSearch, setTapperSearch] = useState("");
  const [editingTapper, setEditingTapper] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile> & { first_name?: string; last_name?: string }>({});
  const [editTab, setEditTab] = useState<"info" | "voorkeuren">("info");
  const [savingTapper, setSavingTapper] = useState(false);
  const [tapperSort, setTapperSort] = useState<"name" | "taps">("name");
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function openEditTapper(p: Profile) {
    setEditingTapper(p);
    setEditTab("info");
    const nameParts = (p.full_name || "").split(" ");
    setEditForm({
      first_name: nameParts[0] || "", last_name: nameParts.slice(1).join(" ") || "",
      full_name: p.full_name || "", email: p.email || "", phone: p.phone || "", role: p.role || "tapper",
      preferred_frequency: p.preferred_frequency || 4,
      preferred_days: p.preferred_days || [],
      preferred_roles: p.preferred_roles || ["tapper"],
      wants_parties: p.wants_parties || false,
      unavailable_months: p.unavailable_months || [],
    });
  }

  function toggleEditDay(day: string) {
    const days = (editForm.preferred_days || []).includes(day as "wednesday" | "friday" | "saturday")
      ? (editForm.preferred_days || []).filter(d => d !== day)
      : [...(editForm.preferred_days || []), day as "wednesday" | "friday" | "saturday"];
    setEditForm(f => ({ ...f, preferred_days: days }));
  }
  function toggleEditRole(role: string) {
    const roles = (editForm.preferred_roles || []).includes(role as "tapper" | "bonnenkassa")
      ? (editForm.preferred_roles || []).filter(r => r !== role)
      : [...(editForm.preferred_roles || []), role as "tapper" | "bonnenkassa"];
    setEditForm(f => ({ ...f, preferred_roles: roles }));
  }
  function toggleEditMonth(idx: number) {
    const months = (editForm.unavailable_months || []).includes(idx)
      ? (editForm.unavailable_months || []).filter(m => m !== idx)
      : [...(editForm.unavailable_months || []), idx];
    setEditForm(f => ({ ...f, unavailable_months: months }));
  }

  async function saveTapper() {
    if (!editingTapper) return;
    setSavingTapper(true);
    const saveData = { ...editForm, full_name: `${editForm.first_name} ${editForm.last_name}`.trim() };
    const res = await fetch(`/api/admin/tappers/${editingTapper.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(saveData) });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackMsg({ text:`❌ Opslaan mislukt: ${data.error ?? "Probeer opnieuw."}`, ok:false });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setProfiles(ps => ps.map(p => p.id === editingTapper.id ? { ...p, ...data.data } : p));
      setEditingTapper(null);
    }
    setSavingTapper(false);
  }

  async function deleteTapper(tapperId: string, tapperName: string) {
    setConfirmModal({
      title: "Tapper verwijderen",
      message: `Weet je zeker dat je ${tapperName} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/tappers/${tapperId}/delete`, { method:"DELETE" });
        setConfirmModal(null);
        if (res.ok) {
          setProfiles(ps => ps.filter(p => p.id !== tapperId));
          setEditingTapper(null);
          setFeedbackMsg({ text:`✅ ${tapperName} is verwijderd.`, ok:true });
          setTimeout(() => setFeedbackMsg(null), 3000);
        } else {
          const d = await res.json().catch(() => ({}));
          setFeedbackMsg({ text:`❌ Verwijderen mislukt: ${d.error ?? "Probeer opnieuw."}`, ok:false });
          setTimeout(() => setFeedbackMsg(null), 4000);
        }
      },
    });
  }

  const filteredProfiles = profiles
    .filter(p =>
      p.full_name?.toLowerCase().includes(tapperSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(tapperSearch.toLowerCase())
    )
    .sort((a, b) => {
      if (tapperSort === "taps") {
        const aTaps = leaderboard.find(l => l.id === a.id)?.taps_this_year || 0;
        const bTaps = leaderboard.find(l => l.id === b.id)?.taps_this_year || 0;
        return bTaps - aTaps;
      }
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

  return (
    <>
      {feedbackMsg && (
        <div style={{ background: feedbackMsg.ok ? "rgba(0,229,195,0.08)" : "rgba(255,79,109,0.08)", border:`1px solid ${feedbackMsg.ok ? "#00e5c3" : "#ff4f6d"}`, borderRadius:10, padding:"10px 14px", fontSize:13, color: feedbackMsg.ok ? "#00e5c3" : "#ff4f6d", fontWeight:700, marginBottom:12 }}>
          {feedbackMsg.text}
        </div>
      )}
      <p className={styles.sectionTitle}>Alle tappers ({profiles.length})</p>
      <input className={styles.input} placeholder="🔍 Zoek op naam of e-mail..." value={tapperSearch} onChange={e => setTapperSearch(e.target.value)} />
      <div style={{ display:"flex", gap:6, marginBottom:10, alignItems:"center" }}>
        <span style={{ fontSize:11, color:"#8b80b0" }}>Sorteer:</span>
        {(["name","taps"] as const).map(opt => (
          <button key={opt} onClick={() => setTapperSort(opt)} style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", background: tapperSort === opt ? "rgba(0,229,195,0.1)" : "#221f38", color: tapperSort === opt ? "#00e5c3" : "#8b80b0", border:`1px solid ${tapperSort === opt ? "#00e5c3" : "#2e2a4a"}` }}>
            {opt === "name" ? "Naam" : "Taps ↓"}
          </button>
        ))}
      </div>

      {filteredProfiles.map(p => {
        const lb = leaderboard.find(l => l.id === p.id);
        return (
          <div key={p.id} className={styles.card}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div className={styles.avatar}>{p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:"#e8e0ff" }}>{p.full_name}</p>
                <p style={{ fontSize:11, color:"#8b80b0" }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</p>
                <p style={{ fontSize:11, color:"#8b80b0" }}>{lb?.taps_this_year || 0}x getapt · doel: {p.preferred_frequency}x/mnd</p>
              </div>
              <div style={{ display:"flex", gap:6, flexDirection:"column", alignItems:"flex-end" }}>
                {p.role === "admin" && <span className={`${styles.badge} ${styles.badgeMint}`}>Admin</span>}
                <button style={s.editBtn} onClick={() => openEditTapper(p)}>✏️ Bewerken</button>
              </div>
            </div>
          </div>
        );
      })}

      {editingTapper && (
        <div className={styles.overlay} onClick={() => setEditingTapper(null)}>
          <div className={styles.sheet} style={{ maxHeight:"85vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <p className={styles.sheetTitle}>{editingTapper.full_name} bewerken</p>
            <div style={{ display:"flex", borderBottom:"1px solid #2e2a4a", marginBottom:16 }}>
              {(["info", "voorkeuren"] as const).map(id => (
                <button key={id} onClick={() => setEditTab(id)} style={{ flex:1, padding:"8px", background:"none", border:"none", fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer", color:editTab === id ? "#00e5c3" : "#8b80b0", borderBottom:`2px solid ${editTab === id ? "#00e5c3" : "transparent"}` }}>
                  {id === "info" ? "👤 Info" : "⚙️ Voorkeuren"}
                </button>
              ))}
            </div>

            {editTab === "info" && (
              <>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1 }}><label className={styles.label}>Voornaam</label><input className={styles.input} value={editForm.first_name || ""} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                  <div style={{ flex:1 }}><label className={styles.label}>Achternaam</label><input className={styles.input} value={editForm.last_name || ""} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} /></div>
                </div>
                <label className={styles.label}>E-mailadres</label>
                <input className={styles.input} type="email" value={editForm.email || ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                <label className={styles.label}>Telefoonnummer</label>
                <input className={styles.input} type="tel" value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+31 6 12345678" />
                <label className={styles.label}>Rol</label>
                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  {(["tapper", "admin"] as const).map(r => (
                    <div key={r} className={`${styles.chip}${editForm.role === r ? ` ${styles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => setEditForm(f => ({ ...f, role: r }))}>
                      {r === "admin" ? "⚡ Admin" : "🍺 Tapper"}
                    </div>
                  ))}
                </div>
              </>
            )}

            {editTab === "voorkeuren" && (
              <>
                <label className={styles.label}>Tapfrequentie per maand</label>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <input type="range" min={1} max={20} value={editForm.preferred_frequency || 4} onChange={e => setEditForm(f => ({ ...f, preferred_frequency: Number(e.target.value) }))} style={{ flex:1, accentColor:"#00e5c3", marginRight:12 }} />
                  <span style={{ fontFamily:"monospace", fontSize:18, color:"#00e5c3", minWidth:40 }}>{editForm.preferred_frequency}x</span>
                </div>
                <label className={styles.label}>Voorkeursdagen</label>
                <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                  {(["wednesday", "friday", "saturday"] as const).map(v => (
                    <div key={v} className={`${styles.chip}${(editForm.preferred_days || []).includes(v) ? ` ${styles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => toggleEditDay(v)}>
                      {v === "wednesday" ? "Wo" : v === "friday" ? "Vr" : "Za"}
                    </div>
                  ))}
                </div>
                <label className={styles.label}>Voorkeursdiensten</label>
                <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                  {(["tapper", "bonnenkassa"] as const).map(v => (
                    <div key={v} className={`${styles.chip}${(editForm.preferred_roles || []).includes(v) ? ` ${styles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => toggleEditRole(v)}>
                      {v === "bonnenkassa" ? "🎟 Kassa" : "🍺 Tappen"}
                    </div>
                  ))}
                  <div className={`${styles.chip}${editForm.wants_parties ? ` ${styles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => setEditForm(f => ({ ...f, wants_parties: !f.wants_parties }))}>🎉 Feestjes</div>
                </div>
                <label className={styles.label}>Niet beschikbaar in</label>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 }}>
                  {MONTH_NAMES_SHORT.map((name, idx) => (
                    <div key={idx} className={`${styles.chip}${(editForm.unavailable_months || []).includes(idx) ? ` ${styles.chipUnavailable}` : ""}`} style={{ textAlign:"center", padding:"6px 4px", fontSize:11 }} onClick={() => toggleEditMonth(idx)}>{name}</div>
                  ))}
                </div>
              </>
            )}

            <button className={styles.btnPrimary} onClick={saveTapper} disabled={savingTapper}>{savingTapper ? "Opslaan..." : "💾 Opslaan"}</button>
            <button className={styles.btnSecondary} style={{ marginTop:8 }} onClick={() => setEditingTapper(null)}>Annuleren</button>
            <div style={{ borderTop:"1px solid #2e2a4a", paddingTop:16, marginTop:16 }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#ff4f6d", textTransform:"uppercase", marginBottom:10 }}>⚠️ Danger zone</p>
              <button className={styles.btnSecondary} style={{ color:"#ff4f6d", borderColor:"#ff4f6d" }} onClick={() => deleteTapper(editingTapper.id, editingTapper.full_name)}>🗑 Tapper verwijderen</button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className={styles.overlay} onClick={() => setConfirmModal(null)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <p className={styles.sheetTitle}>{confirmModal.title}</p>
            <p style={{ fontSize:14, color:"#8b80b0", marginBottom:20, lineHeight:1.5 }}>{confirmModal.message}</p>
            <button className={styles.btnPrimary} style={{ background:"linear-gradient(135deg,#ff4f6d,#cc3355)", boxShadow:"0 4px 20px rgba(255,79,109,0.3)" }} onClick={confirmModal.onConfirm}>Bevestigen</button>
            <button className={styles.btnSecondary} style={{ marginTop:8 }} onClick={() => setConfirmModal(null)}>Annuleren</button>
          </div>
        </div>
      )}
    </>
  );
}
