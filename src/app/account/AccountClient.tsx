"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { parseLocalDate } from "@/lib/dates";
import type { Profile, Notification } from "@/types";
import { useApp } from "@/components/layout/AppShell";
import sharedStyles from "@/styles/shared.module.css";

const MEDALS = ["🥇","🥈","🥉"];
const MONTH_NAMES = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const MONTH_NAMES_FULL = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

// SVG icons for notifications
const NotifCalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const NotifClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const NotifOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>
  </svg>
);
const NotifMessageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11l18-5v12L3 13M11.6 16.8a3 3 0 11-5.8-1.6"/>
  </svg>
);

function getNotifIcon(type: string) {
  if (type === "roster_published" || type === "shift_assigned") return <NotifCalendarIcon />;
  if (type.includes("reminder")) return <NotifClockIcon />;
  if (type === "open_shift" || type === "shift_cancelled") return <NotifOpenIcon />;
  return <NotifMessageIcon />;
}

function stripLeadingEmoji(s: string): string {
  return s.replace(/^[\p{Emoji_Presentation}\p{Emoji}️]\s*/gu, "").trimStart();
}

function getNotifSortDate(n: Notification): Date {
  return new Date(n.created_at);
}

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

  const [firstName, setFirstName] = useState(
    profile.first_name || profile.full_name?.split(" ")[0] || ""
  );
  const [lastName, setLastName] = useState(
    profile.last_name || (profile.full_name?.includes(" ") ? profile.full_name.split(" ").slice(1).join(" ") : "")
  );
  const [phone, setPhone] = useState(profile.phone || "");
  const [email, setEmail] = useState(profile.email || "");

  const [unavailableMonths, setUnavailableMonths] = useState<number[]>(
    profile.unavailable_months || []
  );

  async function handleSavePersonal(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    await supabase.from("profiles").update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: fullName,
      phone,
      email,
    }).eq("id", profile.id);
    setProfile(p => ({ ...p, first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName, email, phone }));
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

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    const remaining = notifs.filter(n => !n.read && n.id !== id).length;
    setUnreadCount(remaining);
  }

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false);
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  }

  function toggleDay(day: string) {
    setProfile(p => {
      const days = p.preferred_days.includes(day as any)
        ? p.preferred_days.filter(d => d !== day)
        : [...p.preferred_days, day as any];
      return { ...p, preferred_days: days };
    });
  }

  function toggleRole(role: string) {
    setProfile(p => {
      const roles = p.preferred_roles.includes(role as any)
        ? p.preferred_roles.filter(r => r !== role)
        : [...p.preferred_roles, role as any];
      return { ...p, preferred_roles: roles };
    });
  }

  function toggleMonth(monthIdx: number) {
    setUnavailableMonths(m =>
      m.includes(monthIdx) ? m.filter(x => x !== monthIdx) : [...m, monthIdx]
    );
  }

  const myStats = leaderboard.find(l => l.id === profile.id);
  const tapsPct = Math.min(100, Math.round(((myStats?.taps_this_year || 0) / Math.max(1, profile.preferred_frequency * 4)) * 100));
  const [tapsPctAnimated, setTapsPctAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setTapsPctAnimated(tapsPct), 80);
    return () => clearTimeout(t);
  }, [tapsPct]);

  const unreadNotifCount = notifs.filter(n => !n.read).length;
  const TABS = [
    { id: "profiel", label: "Profiel" },
    { id: "voorkeuren", label: "Voorkeuren" },
    { id: "stats", label: "Stats" },
    { id: "notif", label: "Notificaties" },
  ];

  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.full_name || "";
  const avatarInitials = [
    (profile.first_name || profile.full_name?.split(" ")[0] || "?")[0],
    (profile.last_name || profile.full_name?.split(" ")[1] || "")[0],
  ].filter(Boolean).join("").slice(0, 2).toUpperCase() || "?";

  // Group notifications by month
  function groupNotifsByMonth(ns: Notification[]): { label: string; items: Notification[] }[] {
    const sorted = [...ns].sort((a, b) => {
      return getNotifSortDate(b).getTime() - getNotifSortDate(a).getTime();
    });
    const groups: { label: string; items: Notification[] }[] = [];
    const seen = new Map<string, Notification[]>();
    for (const n of sorted) {
      const d = getNotifSortDate(n);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`;
      if (!seen.has(key)) { seen.set(key, []); groups.push({ label, items: seen.get(key)! }); }
      seen.get(key)!.push(n);
    }
    return groups;
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.profileHeader}>
        <div style={{ ...s.avatar, flexShrink:0 }}>
          {avatarInitials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={s.name}>{displayName}</p>
          <p style={s.emailTxt}>{profile.email}</p>
          {profile.role === "admin" && <span className={`${sharedStyles.badge} ${sharedStyles.badgeMint}`} style={{ marginTop:6, display:"inline-block" }}>⚡ Admin</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className={sharedStyles.tabBarWrap}>
        <div style={s.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              aria-label={t.id === "notif" && unreadNotifCount > 0 ? `Notificaties (${unreadNotifCount} ongelezen)` : t.label}
              aria-current={tab === t.id ? "true" : undefined}
              style={{ ...s.tab, color: tab===t.id?"#00e5c3":"#a89ec8", borderBottom:`2px solid ${tab===t.id?"#00e5c3":"transparent"}`, fontWeight: tab===t.id ? 900 : 600, position:"relative" }}>
              {t.label}
              {t.id === "notif" && unreadNotifCount > 0 && (
                <span aria-hidden="true" style={{ position:"absolute", top:4, right:2, width:10, height:10, borderRadius:"50%", background:"#ff4f6d", display:"block" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── PROFIEL ── */}
      {tab === "profiel" && (
        <>
          {savedProfile && <div style={s.savedBanner}>Gegevens opgeslagen!</div>}
          <p className={sharedStyles.sectionTitle}>Persoonlijke gegevens</p>
          <form onSubmit={handleSavePersonal}>
            <div className={sharedStyles.card}>
              <label className={sharedStyles.label}>Voornaam</label>
              <input
                className={sharedStyles.input}
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Voornaam"
                required
              />
              <label className={sharedStyles.label}>Achternaam</label>
              <input
                className={sharedStyles.input}
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Achternaam"
              />
              <label className={sharedStyles.label}>E-mailadres</label>
              <input className={sharedStyles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jij@email.nl" required />
              <label className={sharedStyles.label}>Telefoonnummer</label>
              <input className={sharedStyles.input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+31 6 12345678" />
              <button className={sharedStyles.btnPrimary} type="submit" disabled={savingProfile}>
                {savingProfile ? "Opslaan..." : "Gegevens opslaan"}
              </button>
            </div>
          </form>

          <button className={sharedStyles.btnSecondary} style={{ marginTop:12, color:"#ff4f6d", borderColor:"#ff4f6d" }} onClick={handleLogout}>Uitloggen</button>
        </>
      )}

      {/* ── VOORKEUREN ── */}
      {tab === "voorkeuren" && (
        <>
          {saved && <div style={s.savedBanner}>Voorkeuren opgeslagen!</div>}

          <p className={sharedStyles.sectionTitle}>Tapfrequentie</p>
          <div className={sharedStyles.card}>
            <p style={{ fontSize:13, color:"#a89ec8", marginBottom:16 }}>Gewenste diensten per kwartaal</p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <button type="button" className={sharedStyles.iconBtn} style={{ width:44, height:44, fontSize:22, flexShrink:0 }}
                onClick={() => setProfile(p => ({ ...p, preferred_frequency: Math.max(1, p.preferred_frequency - 1) }))}>
                −
              </button>
              <div style={{ textAlign:"center" }}>
                <span style={{ fontFamily:"monospace", fontSize:36, fontWeight:700, color:"#00e5c3", lineHeight:1, display:"block" }}>{profile.preferred_frequency}</span>
                <span style={{ fontSize:11, color:"#a89ec8", letterSpacing:"0.08em", textTransform:"uppercase" as const }}>per kwartaal</span>
              </div>
              <button type="button" className={sharedStyles.iconBtn} style={{ width:44, height:44, fontSize:22, flexShrink:0 }}
                onClick={() => setProfile(p => ({ ...p, preferred_frequency: Math.min(12, p.preferred_frequency + 1) }))}>
                +
              </button>
            </div>
            <p style={{ fontSize:11, color:"#a89ec8", marginTop:12, textAlign:"center" as const }}>
              = {profile.preferred_frequency * 4}x per jaar
            </p>
          </div>

          <p className={sharedStyles.sectionTitle}>Voorkeursdagen</p>
          <div className={sharedStyles.card}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["wednesday","Woensdag"],["friday","Vrijdag"],["saturday","Zaterdag"]].map(([v,l]) => (
                <button type="button" key={v} className={`${sharedStyles.chip}${profile.preferred_days.includes(v as any) ? ` ${sharedStyles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => toggleDay(v)}>{l}</button>
              ))}
            </div>
          </div>

          <p className={sharedStyles.sectionTitle}>Ik doe ook mee met</p>
          <div className={sharedStyles.card}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["tapper","Tappen"],["bonnenkassa","Bonnenkassa"]].map(([v,l]) => (
                <button type="button" key={v} className={`${sharedStyles.chip}${profile.preferred_roles.includes(v as any) ? ` ${sharedStyles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => toggleRole(v)}>{l}</button>
              ))}
              <button type="button" className={`${sharedStyles.chip}${profile.wants_parties ? ` ${sharedStyles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => setProfile(p => ({ ...p, wants_parties: !p.wants_parties }))}>Feestjes</button>
            </div>
          </div>

          <p className={sharedStyles.sectionTitle}>Niet beschikbaar in</p>
          <div className={sharedStyles.card}>
            <p style={{ fontSize:12, color:"#a89ec8", marginBottom:12 }}>
              Selecteer de maanden waarin je niet wilt tappen (bijv. vakantie). De planner houdt hier rekening mee.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 }}>
              {MONTH_NAMES.map((name, idx) => (
                <button type="button" key={idx}
                  className={`${sharedStyles.chip}${unavailableMonths.includes(idx) ? ` ${sharedStyles.chipUnavailable}` : ""}`}
                  style={{ textAlign:"center", padding:"8px 4px", fontSize:11 }}
                  onClick={() => toggleMonth(idx)}>
                  {name}
                </button>
              ))}
            </div>
            {unavailableMonths.length > 0 && (
              <p style={{ fontSize:11, color:"#ff4f6d", marginTop:10 }}>
                Niet beschikbaar: {unavailableMonths.map(m => MONTH_NAMES[m]).join(", ")}
              </p>
            )}
          </div>

          <button className={sharedStyles.btnPrimary} onClick={handleSavePreferences} disabled={saving}>
            {saving ? "Opslaan..." : "Voorkeuren opslaan"}
          </button>
        </>
      )}

      {/* ── STATS ── */}
      {tab === "stats" && (
        <>
          <p className={sharedStyles.sectionTitle}>Jouw jaar</p>
          <div style={s.statGrid}>
            {[
              { val: myStats?.taps_this_year || 0, label: "Getapt" },
              { val: `#${myStats?.rank || "-"}`, label: `Positie · ${leaderboard.length} tappers` },
              { val: profile.preferred_frequency, label: "Doel/kwartaal" },
              { val: Math.max(0, (profile.preferred_frequency * 4) - (myStats?.taps_this_year || 0)), label: "Nog nodig" },
            ].map(({ val, label }) => (
              <div key={label} style={s.statCard}>
                <p style={s.statVal}>{val}</p>
                <p style={s.statLabel}>{label}</p>
              </div>
            ))}
          </div>

          <div className={sharedStyles.card}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:"#a89ec8" }}>Voortgang dit jaar ({myStats?.taps_this_year||0}/{profile.preferred_frequency*4})</span>
              <span style={{ fontFamily:"monospace", fontSize:12, color:"#00e5c3" }}>{tapsPct}%</span>
            </div>
            <div style={s.progressWrap}><div style={{ ...s.progressFill, width:`${tapsPctAnimated}%` }} /></div>
          </div>

          <p className={sharedStyles.sectionTitle}>Leaderboard</p>
          <div className={sharedStyles.card}>
            {leaderboard.map((lb) => {
              const rankBg = lb.rank===1 ? "rgba(255,215,0,0.07)" : lb.rank===2 ? "rgba(192,192,192,0.07)" : lb.rank===3 ? "rgba(205,127,50,0.07)" : lb.id===profile.id ? "rgba(0,229,195,0.06)" : "transparent";
              const rankBorder = lb.rank===1 ? "1px solid rgba(255,215,0,0.25)" : lb.rank===2 ? "1px solid rgba(192,192,192,0.2)" : lb.rank===3 ? "1px solid rgba(205,127,50,0.2)" : lb.id===profile.id ? "1px solid rgba(0,229,195,0.2)" : "1px solid transparent";
              return (
              <div key={lb.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderRadius:10, marginBottom:4, background:rankBg, border:rankBorder }}>
                <span style={{ fontSize:lb.rank<=3?20:16, fontFamily:"monospace", width:28, textAlign:"center", color:lb.rank<=3?undefined:"#b8b0d4" }}>
                  {lb.rank<=3?MEDALS[lb.rank-1]:lb.rank}
                </span>
                <div style={s.avatarSm}>{(lb.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0,2)}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:lb.id===profile.id?"#00e5c3":"#e8e0ff" }}>{lb.full_name}{lb.id===profile.id?" (jij)":""}</p>
                </div>
                <span style={{ fontFamily:"monospace", fontSize:14, color:"#00e5c3" }}>{lb.taps_this_year}x</span>
              </div>
            );})}
          </div>
        </>
      )}

      {/* ── NOTIFICATIES ── */}
      {tab === "notif" && (
        <>
          {unreadNotifCount > 0 && (
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
              <button onClick={markAllRead} style={{ padding:"5px 14px", borderRadius:20, background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Exo 2',sans-serif" }}>
                Alles gelezen
              </button>
            </div>
          )}
          {notifs.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#a89ec8" }}>Geen notificaties.</div>
          ) : (() => {
            const groups = groupNotifsByMonth(notifs);
            return groups.map(group => (
              <div key={group.label}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#a89ec8", margin:"12px 0 6px" }}>{group.label}</p>
                {group.items.map(n => {
                  const notifHref = n.type === "admin_message" ? "/dashboard" : "/rooster";
                  const shiftDate = (n as any).shift?.date;
                  const shiftTime = (n as any).shift?.start_time;
                  const isActive = n.type.includes("open") || n.type.includes("reminder");
                  return (
                  <div key={n.id} className={sharedStyles.card} style={{ opacity:n.read?0.72:1, borderLeft:`4px solid ${n.read ? "#2e2a4a" : isActive ? "#ffb547" : "#00e5c3"}`, cursor:"pointer" }}
                    onClick={() => { markRead(n.id); router.push(notifHref); }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:n.read ? "rgba(255,255,255,0.03)" : "rgba(0,229,195,0.08)", display:"flex", alignItems:"center", justifyContent:"center", color: n.read ? "#a89ec8" : isActive ? "#ffb547" : "#00e5c3" }}>
                        {getNotifIcon(n.type)}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13, fontWeight:700, color: n.read ? "#a89ec8" : "#f0eeff" }}>{stripLeadingEmoji(n.title)}</p>
                        <p style={{ fontSize:12, color:"#a89ec8", marginTop:2, lineHeight:1.4 }}>{n.message}</p>
                        <p style={{ fontSize:11, color:"#a89ec8", marginTop:6 }}>
                          {shiftDate
                            ? `${parseLocalDate(shiftDate).toLocaleDateString("nl-NL", { day:"numeric", month:"short" })}${shiftTime ? " · " + shiftTime.slice(0,5) : ""}`
                            : new Date(n.created_at).toLocaleString("nl-NL", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                        </p>
                      </div>
                      {!n.read ? (
                        <button aria-label="Markeer als gelezen" onClick={(e) => { e.stopPropagation(); markRead(n.id); }} style={{ flexShrink:0, minHeight:44, minWidth:44, padding:"0 10px", borderRadius:20, background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:11, fontWeight:700, cursor:"pointer", alignSelf:"flex-start", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span aria-hidden="true">✓</span>
                        </button>
                      ) : (
                        <span style={{ flexShrink:0, fontSize:14, color:"#4a4470", alignSelf:"flex-start", marginTop:2 }}>✓</span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            ));
          })()}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:"16px 16px 100px" },
  profileHeader: { display:"flex", gap:14, alignItems:"center", marginBottom:16, padding:16, background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16 },
  avatar: { width:56, height:56, borderRadius:12, background:"linear-gradient(135deg, #3b2f6e, #5a4a9e)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:20, color:"#00e5c3", flexShrink:0 },
  name: { fontSize:17, fontWeight:700, color:"#f0eeff", fontFamily:"'Exo 2', sans-serif" },
  emailTxt: { fontSize:12, color:"#a89ec8", marginTop:2 },
  tabBar: { display:"flex", borderBottom:"1px solid #2e2a4a", marginBottom:16, marginTop:8, overflowX:"auto" },
  tab: { flex:1, minWidth:70, padding:"10px 4px", background:"none", border:"none", fontFamily:"'Exo 2', sans-serif", fontWeight:700, fontSize:11, cursor:"pointer", textAlign:"center", whiteSpace:"nowrap" },
  savedBanner: { background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center", marginBottom:12 },
  statGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 },
  statCard: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, textAlign:"center" },
  statVal: { fontFamily:"monospace", fontSize:28, fontWeight:700, color:"#00e5c3", margin:0 },
  statLabel: { fontSize:10, color:"#a89ec8", letterSpacing:"0.08em", textTransform:"uppercase", marginTop:4, margin:0 },
  progressWrap: { background:"#2e2a4a", borderRadius:4, height:6, overflow:"hidden" },
  progressFill: { height:"100%", borderRadius:4, background:"linear-gradient(90deg, #00e5c3, #00b89c)", transition:"width 0.6s ease" },
  avatarSm: { width:30, height:30, borderRadius:8, background:"linear-gradient(135deg, #3b2f6e, #5a4a9e)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#00e5c3", flexShrink:0 },
};
