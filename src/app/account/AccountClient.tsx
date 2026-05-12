"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile, Notification } from "@/types";
import { useApp } from "@/components/layout/AppShell";

const MEDALS = ["🥇","🥈","🥉"];
const MONTH_NAMES = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

export default function AccountClient({ profile: initialProfile, leaderboard, notifications: initialNotifs }: { profile: Profile; leaderboard: any[]; notifications: Notification[]; }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { setUnreadCount } = useApp();

  const defaultTab = searchParams.get("tab") === "notif" ? "notif" : "profiel";
  const [tab, setTab] = useState<"profiel"|"voorkeuren"|"stats"|"notif">(defaultTab as any);
  const [profile, setProfile] = useState(initialProfile);
  const [notifs, setNotifs] = useState(initialNotifs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  const nameParts = profile.full_name?.split(" ") || [];
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") || "");
  const [phone, setPhone] = useState((profile as any).phone || "");
  const [email, setEmail] = useState(profile.email || "");

  // Vakantieperiodes: welke maanden niet beschikbaar
  const [unavailableMonths, setUnavailableMonths] = useState<number[]>(
    (profile as any).unavailable_months || []
  );

  useEffect(() => {
    if (tab === "notif") {
      supabase.from("notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false)
        .then(() => {
          setNotifs(n => n.map(x => ({ ...x, read: true })));
          setUnreadCount(0);
        });
    }
  }, [tab]);

  async function handleSavePersonal(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    await supabase.from("profiles").update({ phone, email }).eq("id", profile.id);
    setProfile(p => ({ ...p, email }));
    setSavingProfile(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  async function handleSavePreferences() {
    setSaving(true);
    await supabase.from("profiles").update({
      preferred_frequency: profile.preferred_frequency,
      preferred_days: profile.preferred_days,
      preferred_roles: profile.preferred_roles,
      wants_parties: profile.wants_parties,
      unavailable_months: unavailableMonths,
    }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleDay(day: string) {
    const days = profile.preferred_days.includes(day as any)
      ? profile.preferred_days.filter(d => d !== day)
      : [...profile.preferred_days, day as any];
    setProfile(p => ({ ...p, preferred_days: days }));
  }

  function toggleRole(role: string) {
    const roles = profile.preferred_roles.includes(role as any)
      ? profile.preferred_roles.filter(r => r !== role)
      : [...profile.preferred_roles, role as any];
    setProfile(p => ({ ...p, preferred_roles: roles }));
  }

  function toggleMonth(monthIdx: number) {
    setUnavailableMonths(m =>
      m.includes(monthIdx) ? m.filter(x => x !== monthIdx) : [...m, monthIdx]
    );
  }

  const myStats = leaderboard.find(l => l.id === profile.id);
  const tapsPct = Math.min(100, Math.round(((myStats?.taps_this_year || 0) / (profile.preferred_frequency * 12)) * 100));

  const TABS = [
    { id: "profiel", label: "👤 Profiel" },
    { id: "voorkeuren", label: "⚙️ Voorkeuren" },
    { id: "stats", label: "🏆 Stats" },
    { id: "notif", label: `🔔${notifs.filter(n => !n.read).length > 0 ? ` (${notifs.filter(n => !n.read).length})` : ""}` },
  ];

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.profileHeader}>
        <div style={s.avatar}>{profile.full_name.split(" ").map(n => n[0]).join("").slice(0,2)}</div>
        <div>
          <p style={s.name}>{profile.full_name}</p>
          <p style={s.emailTxt}>{profile.email}</p>
          {profile.role === "admin" && <span style={s.adminBadge}>⚡ Admin</span>}
        </div>
      </div>

      {profile.role === "admin" && (
        <button style={s.adminBtn} onClick={() => router.push("/admin")}>⚙️ Admin Dashboard</button>
      )}

      {/* Tabs */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ ...s.tab, color: tab===t.id?"#00e5c3":"#8b80b0", borderBottom:`2px solid ${tab===t.id?"#00e5c3":"transparent"}` }}>{t.label}</button>
        ))}
      </div>

      {/* ── PROFIEL ── */}
      {tab === "profiel" && (
        <>
          {savedProfile && <div style={s.savedBanner}>✅ Gegevens opgeslagen!</div>}
          <p style={s.sectionTitle}>Persoonlijke gegevens</p>
          <form onSubmit={handleSavePersonal}>
            <div style={s.card}>
              <div style={{ background:"#221f38", borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
                <p style={{ fontSize:11, color:"#8b80b0", marginBottom:4, textTransform:"uppercase", letterSpacing:1, fontWeight:700 }}>Naam</p>
                <p style={{ fontSize:15, color:"#e8e0ff", fontWeight:600 }}>{profile.full_name}</p>
                <p style={{ fontSize:11, color:"#8b80b0", marginTop:4 }}>Naam aanpassen? Vraag een admin.</p>
              </div>
              <label style={s.label}>E-mailadres</label>
              <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jij@email.nl" required />
              <label style={s.label}>Telefoonnummer</label>
              <input style={s.input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+31 6 12345678" />
              <button style={s.btnPrimary} type="submit" disabled={savingProfile}>
                {savingProfile ? "Opslaan..." : "💾 Gegevens opslaan"}
              </button>
            </div>
          </form>

          <p style={s.sectionTitle}>Beveiliging</p>
          <div style={s.card}>
            <button style={s.btnSecondary} onClick={() => router.push("/reset-password")}>🔑 Wachtwoord wijzigen</button>
          </div>
          <button style={{ ...s.btnSecondary, marginTop:12, color:"#ff4f6d", borderColor:"#ff4f6d" }} onClick={handleLogout}>Uitloggen</button>
        </>
      )}

      {/* ── VOORKEUREN ── */}
      {tab === "voorkeuren" && (
        <>
          {saved && <div style={s.savedBanner}>✅ Voorkeuren opgeslagen!</div>}

          <p style={s.sectionTitle}>Tapfrequentie</p>
          <div style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:14, color:"#e8e0ff" }}>Gewenste diensten per maand</span>
              <span style={{ fontFamily:"monospace", fontSize:22, color:"#00e5c3" }}>{profile.preferred_frequency}x</span>
            </div>
            <input type="range" min={1} max={20}
              value={profile.preferred_frequency}
              onChange={e => setProfile(p => ({ ...p, preferred_frequency: Number(e.target.value) }))}
              style={{ width:"100%", accentColor:"#00e5c3" }} />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:11, color:"#8b80b0" }}>1x per maand</span>
              <span style={{ fontSize:11, color:"#8b80b0" }}>20x per maand</span>
            </div>
            <p style={{ fontSize:11, color:"#8b80b0", marginTop:8 }}>
              Dat zijn ongeveer {profile.preferred_frequency * 12}x per jaar
            </p>
          </div>

          <p style={s.sectionTitle}>Voorkeursdagen</p>
          <div style={s.card}>
            <div style={s.chipRow}>
              {[["wednesday","Woensdag"],["friday","Vrijdag"],["saturday","Zaterdag"]].map(([v,l]) => (
                <div key={v} style={{ ...s.chip, ...(profile.preferred_days.includes(v as any)?s.chipActive:{}) }} onClick={() => toggleDay(v)}>{l}</div>
              ))}
            </div>
          </div>

          <p style={s.sectionTitle}>Ik doe ook mee met</p>
          <div style={s.card}>
            <div style={s.chipRow}>
              {[["tapper","🍺 Tappen"],["bonnenkassa","🎟 Bonnenkassa"]].map(([v,l]) => (
                <div key={v} style={{ ...s.chip, ...(profile.preferred_roles.includes(v as any)?s.chipActive:{}) }} onClick={() => toggleRole(v)}>{l}</div>
              ))}
              <div style={{ ...s.chip, ...(profile.wants_parties?s.chipActive:{}) }} onClick={() => setProfile(p => ({ ...p, wants_parties: !p.wants_parties }))}>🎉 Feestjes</div>
            </div>
          </div>

          <p style={s.sectionTitle}>Niet beschikbaar in</p>
          <div style={s.card}>
            <p style={{ fontSize:12, color:"#8b80b0", marginBottom:12 }}>
              Selecteer de maanden waarin je niet wilt tappen (bijv. vakantie). De planner houdt hier rekening mee.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 }}>
              {MONTH_NAMES.map((name, idx) => (
                <div key={idx}
                  style={{ ...s.chip, ...(unavailableMonths.includes(idx)?s.chipUnavailable:{}), textAlign:"center", padding:"8px 4px", fontSize:11 }}
                  onClick={() => toggleMonth(idx)}>
                  {name}
                </div>
              ))}
            </div>
            {unavailableMonths.length > 0 && (
              <p style={{ fontSize:11, color:"#ff4f6d", marginTop:10 }}>
                Niet beschikbaar: {unavailableMonths.map(m => MONTH_NAMES[m]).join(", ")}
              </p>
            )}
          </div>

          <button style={s.btnPrimary} onClick={handleSavePreferences} disabled={saving}>
            {saving ? "Opslaan..." : "💾 Voorkeuren opslaan"}
          </button>
        </>
      )}

      {/* ── STATS ── */}
      {tab === "stats" && (
        <>
          <p style={s.sectionTitle}>Jouw jaar</p>
          <div style={s.statGrid}>
            {[
              { val: myStats?.taps_this_year || 0, label: "Getapt" },
              { val: `#${myStats?.rank || "-"}`, label: "Positie" },
              { val: profile.preferred_frequency, label: "Doel/maand" },
              { val: Math.max(0, (profile.preferred_frequency * 12) - (myStats?.taps_this_year || 0)), label: "Te gaan" },
            ].map(({ val, label }) => (
              <div key={label} style={s.statCard}>
                <p style={s.statVal}>{val}</p>
                <p style={s.statLabel}>{label}</p>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:"#8b80b0" }}>Voortgang dit jaar ({myStats?.taps_this_year||0}/{profile.preferred_frequency*12})</span>
              <span style={{ fontFamily:"monospace", fontSize:12, color:"#00e5c3" }}>{tapsPct}%</span>
            </div>
            <div style={s.progressWrap}><div style={{ ...s.progressFill, width:`${tapsPct}%` }} /></div>
          </div>

          <p style={s.sectionTitle}>🏆 Leaderboard</p>
          <div style={s.card}>
            {leaderboard.map((lb) => (
              <div key={lb.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderRadius:10, marginBottom:4, background:lb.id===profile.id?"rgba(0,229,195,0.06)":"transparent", border:lb.id===profile.id?"1px solid rgba(0,229,195,0.2)":"1px solid transparent" }}>
                <span style={{ fontSize:lb.rank<=3?20:16, fontFamily:"monospace", width:28, textAlign:"center", color:lb.rank<=3?undefined:"#8b80b0" }}>
                  {lb.rank<=3?MEDALS[lb.rank-1]:lb.rank}
                </span>
                <div style={s.avatarSm}>{lb.full_name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:lb.id===profile.id?"#00e5c3":"#e8e0ff" }}>{lb.full_name}{lb.id===profile.id?" (jij)":""}</p>
                  <div style={{ ...s.progressWrap, margin:"4px 0 0", height:4 }}>
                    <div style={{ ...s.progressFill, width:`${Math.min(100,Math.round((lb.taps_this_year/(lb.target*12))*100))}%`, height:"100%" }} />
                  </div>
                </div>
                <span style={{ fontFamily:"monospace", fontSize:14, color:"#00e5c3" }}>{lb.taps_this_year}x</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── NOTIFICATIES ── */}
      {tab === "notif" && (
        <>
          {notifs.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#8b80b0" }}>Geen notificaties.</div>
          ) : notifs.map(n => (
            <div key={n.id} style={{ ...s.card, opacity:n.read?0.6:1, borderLeft:`3px solid ${n.type.includes("open")||n.type.includes("reminder")?"#ffb547":"#00e5c3"}` }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:"rgba(0,229,195,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                  {n.type==="roster_published"?"📅":n.type.includes("reminder")?"⏰":n.type==="open_shift"?"🔓":"📢"}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#f0eeff" }}>{n.title}</p>
                  <p style={{ fontSize:12, color:"#8b80b0", marginTop:2, lineHeight:1.4 }}>{n.message}</p>
                  <p style={{ fontSize:11, color:"#8b80b0", marginTop:6 }}>
                    {new Date(n.created_at).toLocaleDateString("nl-NL", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
                {!n.read && <div style={{ width:8, height:8, borderRadius:"50%", background:"#00e5c3", flexShrink:0, marginTop:4 }} />}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:"16px 16px 100px" },
  profileHeader: { display:"flex", gap:14, alignItems:"center", marginBottom:16, padding:16, background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16 },
  avatar: { width:56, height:56, borderRadius:16, background:"linear-gradient(135deg, #3b2f6e, #5a4a9e)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:20, color:"#00e5c3", flexShrink:0 },
  name: { fontSize:17, fontWeight:700, color:"#f0eeff", fontFamily:"'Exo 2', sans-serif" },
  emailTxt: { fontSize:12, color:"#8b80b0", marginTop:2 },
  adminBadge: { display:"inline-block", marginTop:6, fontSize:11, fontWeight:700, background:"rgba(0,229,195,0.1)", border:"1px solid #00e5c3", color:"#00e5c3", borderRadius:20, padding:"2px 10px" },
  adminBtn: { width:"100%", padding:"12px 16px", borderRadius:12, background:"rgba(0,229,195,0.06)", border:"1px solid #00e5c3", color:"#00e5c3", fontFamily:"'Exo 2', sans-serif", fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:4, textAlign:"left" },
  tabBar: { display:"flex", borderBottom:"1px solid #2e2a4a", marginBottom:16, marginTop:8, overflowX:"auto" },
  tab: { flex:1, minWidth:70, padding:"10px 4px", background:"none", border:"none", fontFamily:"'Exo 2', sans-serif", fontWeight:700, fontSize:11, cursor:"pointer", textAlign:"center", whiteSpace:"nowrap" },
  sectionTitle: { fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#8b80b0", margin:"16px 0 8px" },
  card: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, marginBottom:10 },
  label: { display:"block", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#8b80b0", marginBottom:6 },
  input: { width:"100%", background:"#221f38", border:"1px solid #2e2a4a", borderRadius:10, padding:"11px 14px", color:"#e8e0ff", fontFamily:"'Exo 2', sans-serif", fontSize:14, outline:"none", marginBottom:12, display:"block" },
  chipRow: { display:"flex", gap:8, flexWrap:"wrap" },
  chip: { padding:"8px 14px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"1px solid #2e2a4a", background:"#221f38", color:"#8b80b0", textTransform:"uppercase" },
  chipActive: { background:"rgba(0,229,195,0.1)", borderColor:"#00e5c3", color:"#00e5c3" },
  chipUnavailable: { background:"rgba(255,79,109,0.1)", borderColor:"#ff4f6d", color:"#ff4f6d" },
  btnPrimary: { width:"100%", padding:14, borderRadius:12, background:"linear-gradient(135deg, #00e5c3, #00b89c)", color:"#0f0d1a", fontFamily:"'Exo 2', sans-serif", fontSize:15, fontWeight:700, border:"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:1, marginBottom:8 },
  btnSecondary: { width:"100%", padding:14, borderRadius:12, background:"#221f38", color:"#e8e0ff", fontFamily:"'Exo 2', sans-serif", fontSize:15, fontWeight:700, border:"1px solid #2e2a4a", cursor:"pointer", textTransform:"uppercase", letterSpacing:1 },
  savedBanner: { background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center", marginBottom:12 },
  statGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 },
  statCard: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:14, padding:16, textAlign:"center" },
  statVal: { fontFamily:"monospace", fontSize:28, fontWeight:700, color:"#00e5c3", margin:0 },
  statLabel: { fontSize:10, color:"#8b80b0", letterSpacing:1, textTransform:"uppercase", marginTop:4, margin:0 },
  progressWrap: { background:"#2e2a4a", borderRadius:4, height:6, overflow:"hidden" },
  progressFill: { height:"100%", borderRadius:4, background:"linear-gradient(90deg, #00e5c3, #00b89c)", transition:"width 0.6s ease" },
  avatarSm: { width:30, height:30, borderRadius:8, background:"linear-gradient(135deg, #3b2f6e, #5a4a9e)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#00e5c3", flexShrink:0 },
};
