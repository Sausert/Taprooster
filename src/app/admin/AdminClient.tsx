"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Shift } from "@/types";
import { AdminShellContext, type LeaderboardEntry } from "./AdminShellContext";
import { HealthTab } from "./tabs/HealthTab";
import { TappersTab } from "./tabs/TappersTab";
import { RoosterTab } from "./tabs/RoosterTab";
import { InviteTab } from "./tabs/InviteTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { AddTapperModal } from "./components/AddTapperModal";

type AdminTab = "health" | "tappers" | "rooster" | "berichten" | "uitnodiging";

const TABS = [
  { id: "health",      icon: "📊", label: "Status" },
  { id: "tappers",     icon: "👥", label: "Tappers" },
  { id: "rooster",     icon: "📅", label: "Rooster" },
  { id: "berichten",   icon: "📢", label: "Berichten" },
  { id: "uitnodiging", icon: "🔗", label: "Uitnodiging" },
] as const;

export default function AdminClient({
  shifts: initialShifts,
  profiles: initialProfiles,
  leaderboard,
  publishedShifts: initialPublished,
  initialConceptShifts,
}: {
  shifts: Shift[];
  profiles: Profile[];
  leaderboard: LeaderboardEntry[];
  publishedShifts: Shift[];
  initialConceptShifts: Shift[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("health");

  // Shared state — passed to all tabs via context
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [published, setPublished] = useState<Shift[]>(initialPublished);
  const [conceptShifts, setConceptShifts] = useState<Shift[]>(initialConceptShifts);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const mo = d.getMonth() + 1;
    return `${d.getFullYear()}-${String(mo).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [addTapperModal, setAddTapperModal] = useState<Shift | null>(null);
  const [tapperSearchModal, setTapperSearchModal] = useState("");
  const [addingTapper, setAddingTapper] = useState<string | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftEditError, setShiftEditError] = useState<string | null>(null);

  // Shared list mutation helper (used by AdminShiftCard)
  function updateShiftInList(id: string, field: string, value: unknown, list: Shift[], setList: React.Dispatch<React.SetStateAction<Shift[]>>) {
    setList(list.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  // Shared operations
  async function handleAddTapper(shiftId: string, userId: string) {
    setAddingTapper(userId);
    const res = await fetch(`/api/shifts/${shiftId}/assign`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"claim", targetUserId: userId }) });
    if (res.ok) {
      const tapper = profiles.find(p => p.id === userId);
      const updateList = (list: Shift[]) => list.map(s => s.id === shiftId ? { ...s, assignments: [...((s.assignments || []) as any[]), { user_id: userId, status:"assigned", profile: tapper }] } : s);
      setPublished(updateList);
      setConceptShifts(updateList);
      setShifts(updateList);
    }
    setAddingTapper(null);
    setAddTapperModal(null);
    setTapperSearchModal("");
  }

  async function handleRemoveTapper(shiftId: string, userId: string) {
    const res = await fetch(`/api/admin/shifts/${shiftId}/remove-tapper`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ userId }) });
    if (res.ok) {
      const updateList = (list: Shift[]) => list.map(s => s.id === shiftId ? { ...s, assignments: ((s.assignments || []) as any[]).filter((a: any) => a.user_id !== userId) } : s);
      setPublished(updateList);
      setConceptShifts(updateList);
      setShifts(updateList);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`❌ Verwijderen mislukt: ${data.error ?? "Probeer opnieuw."}`);
    }
  }

  async function handleDeleteShift(shiftId: string, source: "concept" | "published") {
    if (!confirm("Weet je zeker dat je deze dienst wilt verwijderen?")) return;
    const res = await fetch(`/api/admin/shifts/${shiftId}/delete`, { method:"DELETE" });
    if (res.ok) {
      if (source === "published") setPublished(ps => ps.filter(s => s.id !== shiftId));
      else setConceptShifts(cs => cs.filter(s => s.id !== shiftId));
      setShifts(ss => ss.filter(s => s.id !== shiftId));
    }
  }

  async function saveShiftEdit(shift: Shift & Record<string, unknown>) {
    setShiftEditError(null);
    const res = await fetch(`/api/shifts/${shift.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ title: shift.title, start_time: shift.start_time, end_time: shift.end_time, max_tappers: shift.max_tappers, admin_note: shift.admin_note }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setShiftEditError(data.error ?? "Opslaan mislukt. Probeer opnieuw.");
      return;
    }
    setEditingShiftId(null);
  }

  return (
    <AdminShellContext.Provider value={{
      shifts, profiles, leaderboard, published, conceptShifts,
      setShifts, setProfiles, setPublished, setConceptShifts,
      dateFrom, dateTo, setDateFrom, setDateTo,
      addTapperModal, setAddTapperModal,
      tapperSearchModal, setTapperSearchModal,
      addingTapper,
      editingShiftId, setEditingShiftId,
      shiftEditError, setShiftEditError,
      handleAddTapper, handleRemoveTapper, handleDeleteShift,
      saveShiftEdit, updateShiftInList,
    }}>
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"#0f0d1a" }}>
        {/* Header */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"rgba(15,13,26,0.92)", backdropFilter:"blur(16px)", borderBottom:"1px solid #2e2a4a", position:"sticky", top:0, zIndex:50 }}>
          <button onClick={() => router.push("/account")} style={{ background:"none", border:"none", color:"#00e5c3", fontSize:22, cursor:"pointer", padding:0, width:28 }}>←</button>
          <span style={{ fontSize:14, fontWeight:700, color:"#f0eeff", letterSpacing:1, fontFamily:"'Exo 2', sans-serif" }}>Admin Dashboard</span>
          <div style={{ width:28 }} />
        </header>

        {/* Tab bar */}
        <nav style={{ display:"flex", borderBottom:"1px solid #2e2a4a", background:"#0f0d1a", overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as AdminTab)} style={{ flex:1, minWidth:80, padding:"12px 4px", background:"none", border:"none", fontFamily:"'Exo 2', sans-serif", fontWeight:tab === t.id ? 900 : 600, fontSize:11, cursor:"pointer", whiteSpace:"nowrap", display:"flex", flexDirection:"column", alignItems:"center", gap:2, color:tab === t.id ? "#00e5c3" : "#b8b0d4", borderBottom:`2px solid ${tab === t.id ? "#00e5c3" : "transparent"}`, transition:"color 0.15s" }}>
              <span style={{ fontSize:16, fontFamily:'"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{t.icon}</span>
              <span style={{ fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase" }}>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 40px" }}>
          {tab === "health"      && <HealthTab />}
          {tab === "tappers"     && <TappersTab />}
          {tab === "rooster"     && <RoosterTab />}
          {tab === "berichten"   && <MessagesTab />}
          {tab === "uitnodiging" && <InviteTab />}
        </div>

        {/* Global add-tapper modal (opened from health + rooster tabs) */}
        <AddTapperModal />
      </div>
    </AdminShellContext.Provider>
  );
}
