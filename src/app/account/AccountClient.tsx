"use client";
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile, Notification } from "@/types";
import { useApp } from "@/components/layout/AppShell";
import sharedStyles from "@/styles/shared.module.css";

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

  const [unavailableMonths, setUnavailableMonths] = useState<number[]>(
    (profile as any).unavailable_months || []
  );

  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url || "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Alleen afbeeldingen toegestaan."); return; }
    if (file.size > 4 * 1024 * 1024) { setAvatarError("Maximaal 4 MB per afbeelding."); return; }
    setAvatarUploading(true);
    setAvatarError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/avatar", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) { setAvatarError(data.error || "Upload mislukt. Probeer opnieuw."); setAvatarUploading(false); return; }
    setAvatarUrl(data.url);
    setAvatarUploading(false);
  }

  async function handleSavePersonal(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    await supabase.from("profiles").update({ phone, email }).eq("id", profile.id);
    setProfile(p => ({ ...p, email, phone }));
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

  const unreadNotifCount = notifs.filter(n => !n.read).length;
  const TABS = [
    { id: "profiel", label: "👤 Profiel" },
    { id: "voorkeuren", label: "⚙️ Voorkeuren" },
    { id: "stats", label: "🏆 Stats" },
    { id: "notif", label: "🔔 Notificaties" },
  ];

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.profileHeader}>
        <div
          style={{ ...s.avatar, cursor:"pointer", position:"relative", overflow:"hidden", flexShrink:0 }}
          onClick={() => fileInputRef.current?.click()}
          title="Profielfoto wijzigen"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profielfoto" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", borderRadius:"inherit" }} onError={() => setAvatarUrl("")} />
          ) : (
            (profile.full_name || "?").split(" ").map(n => n[0]).join("").slice(0,2)
          )}
          {avatarUploading && (
            <div style={{ position:"absolute", inset:0, background:"rgba(15,13,26,0.75)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:16, animation:"spin 1s linear infinite" }}>⏳</span>
            </div>
          )}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"3px 0", background:"rgba(0,229,195,0.18)", fontSize:9, color:"#00e5c3", textAlign:"center", fontWeight:700, letterSpacing:1 }}>📷</div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display:"none" }} />
        <div style={{ flex:1, minWidth:0 }}>
          <p style={s.name}>{profile.full_name}</p>
          <p style={s.emailTxt}>{profile.email}</p>
          {avatarError && <p style={{ fontSize:11, color:"#ff4f6d", marginTop:4 }}>{avatarError}</p>}
          {profile.role === "admin" && <span className={`${sharedStyles.badge} ${sharedStyles.badgeMint}`} style={{ marginTop:6, display:"inline-block" }}>⚡ Admin</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ ...s.tab, color: tab===t.id?"#00e5c3":"#8b80b0", borderBottom:`2px solid ${tab===t.id?"#00e5c3":"transparent"}`, fontWeight: tab===t.id ? 900 : 600, position:"relative" }}>
            {t.label}
            {t.id === "notif" && unreadNotifCount > 0 && (
              <span style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:"50%", background:"#ff4f6d", display:"block" }} />
            )}
          </button>
        ))}
      </div>

      {/* ── PROFIEL ── */}
      {tab === "profiel" && (
        <>
          {savedProfile && <div style={s.savedBanner}>✅ Gegevens opgeslagen!</div>}
          <p className={sharedStyles.sectionTitle}>Persoonlijke gegevens</p>
          <form onSubmit={handleSavePersonal}>
            <div className={sharedStyles.card}>
              <div style={{ background:"#221f38", borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
                <p style={{ fontSize:11, color:"#8b80b0", marginBottom:4, textTransform:"uppercase", letterSpacing:1, fontWeight:700 }}>Naam</p>
                <p style={{ fontSize:15, color:"#e8e0ff", fontWeight:600 }}>{profile.full_name}</p>
                <p style={{ fontSize:11, color:"#8b80b0", marginTop:4 }}>Naam aanpassen? Vraag een admin.</p>
              </div>
              <label className={sharedStyles.label}>E-mailadres</label>
              <input className={sharedStyles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jij@email.nl" required />
              <label className={sharedStyles.label}>Telefoonnummer</label>
              <input className={sharedStyles.input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+31 6 12345678" />
              <button className={sharedStyles.btnPrimary} type="submit" disabled={savingProfile}>
                {savingProfile ? "Opslaan..." : "💾 Gegevens opslaan"}
              </button>
            </div>
          </form>

          <button className={sharedStyles.btnSecondary} style={{ marginTop:12, color:"#ff4f6d", borderColor:"#ff4f6d" }} onClick={handleLogout}>Uitloggen</button>
        </>
      )}

      {/* ── VOORKEUREN ── */}
      {tab === "voorkeuren" && (
        <>
          {saved && <div style={s.savedBanner}>✅ Voorkeuren opgeslagen!</div>}

          <p className={sharedStyles.sectionTitle}>Tapfrequentie</p>
          <div className={sharedStyles.card}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:14, color:"#e8e0ff" }}>Gewenste diensten per kwartaal</span>
              <span style={{ fontFamily:"monospace", fontSize:22, color:"#00e5c3" }}>{profile.preferred_frequency}x</span>
            </div>
            <input type="range" min={1} max={12}
              value={profile.preferred_frequency}
              onChange={e => setProfile(p => ({ ...p, preferred_frequency: Number(e.target.value) }))}
              style={{ width:"100%", accentColor:"#00e5c3" }}
              list="freq-marks"
            />
            <datalist id="freq-marks">
              {[1, 3, 6, 9, 12].map(v => <option key={v} value={v} />)}
            </datalist>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
              <span style={{ fontSize:10, color:"#8b80b0" }}>1x</span>
              <span style={{ fontSize:10, color:"#8b80b0" }}>3x</span>
              <span style={{ fontSize:10, color:"#8b80b0" }}>6x</span>
              <span style={{ fontSize:10, color:"#8b80b0" }}>9x</span>
              <span style={{ fontSize:10, color:"#8b80b0" }}>12x</span>
            </div>
            <p style={{ fontSize:11, color:"#8b80b0", marginTop:8 }}>
              Dat zijn ongeveer {profile.preferred_frequency * 4}x per jaar
            </p>
          </div>

          <p className={sharedStyles.sectionTitle}>Voorkeursdagen</p>
          <div className={sharedStyles.card}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["wednesday","Woensdag"],["friday","Vrijdag"],["saturday","Zaterdag"]].map(([v,l]) => (
                <div key={v} className={`${sharedStyles.chip}${profile.preferred_days.includes(v as any) ? ` ${sharedStyles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => toggleDay(v)}>{l}</div>
              ))}
            </div>
          </div>

          <p className={sharedStyles.sectionTitle}>Ik doe ook mee met</p>
          <div className={sharedStyles.card}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["tapper","🍺 Tappen"],["bonnenkassa","Bonnenkassa 🎟"]].map(([v,l]) => (
                <div key={v} className={`${sharedStyles.chip}${profile.preferred_roles.includes(v as any) ? ` ${sharedStyles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => toggleRole(v)}>{l}</div>
              ))}
              <div className={`${sharedStyles.chip}${profile.wants_parties ? ` ${sharedStyles.chipActive}` : ""}`} style={{ flex:1, textAlign:"center" }} onClick={() => setProfile(p => ({ ...p, wants_parties: !p.wants_parties }))}>🎉 Feestjes</div>
            </div>
          </div>

          <p className={sharedStyles.sectionTitle}>Niet beschikbaar in</p>
          <div className={sharedStyles.card}>
            <p style={{ fontSize:12, color:"#8b80b0", marginBottom:12 }}>
              Selecteer de maanden waarin je niet wilt tappen (bijv. vakantie). De planner houdt hier rekening mee.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 }}>
              {MONTH_NAMES.map((name, idx) => (
                <div key={idx}
                  className={`${sharedStyles.chip}${unavailableMonths.includes(idx) ? ` ${sharedStyles.chipUnavailable}` : ""}`}
                  style={{ textAlign:"center", padding:"8px 4px", fontSize:11 }}
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

          <button className={sharedStyles.btnPrimary} onClick={handleSavePreferences} disabled={saving}>
            {saving ? "Opslaan..." : "💾 Voorkeuren opslaan"}
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
              <span style={{ fontSize:12, color:"#8b80b0" }}>Voortgang dit jaar ({myStats?.taps_this_year||0}/{profile.preferred_frequency*4})</span>
              <span style={{ fontFamily:"monospace", fontSize:12, color:"#00e5c3" }}>{tapsPct}%</span>
            </div>
            <div style={s.progressWrap}><div style={{ ...s.progressFill, width:`${tapsPct}%` }} /></div>
          </div>

          <p className={sharedStyles.sectionTitle}>🏆 Leaderboard</p>
          <div className={sharedStyles.card}>
            {leaderboard.map((lb) => {
              const rankBg = lb.rank===1 ? "rgba(255,215,0,0.07)" : lb.rank===2 ? "rgba(192,192,192,0.07)" : lb.rank===3 ? "rgba(205,127,50,0.07)" : lb.id===profile.id ? "rgba(0,229,195,0.06)" : "transparent";
              const rankBorder = lb.rank===1 ? "1px solid rgba(255,215,0,0.25)" : lb.rank===2 ? "1px solid rgba(192,192,192,0.2)" : lb.rank===3 ? "1px solid rgba(205,127,50,0.2)" : lb.id===profile.id ? "1px solid rgba(0,229,195,0.2)" : "1px solid transparent";
              return (
              <div key={lb.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderRadius:10, marginBottom:4, background:rankBg, border:rankBorder }}>
                <span style={{ fontSize:lb.rank<=3?20:16, fontFamily:"monospace", width:28, textAlign:"center", color:lb.rank<=3?undefined:"#8b80b0" }}>
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
                ✓ Alles gelezen
              </button>
            </div>
          )}
          {notifs.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#8b80b0" }}>Geen notificaties.</div>
          ) : (() => {
            const now2 = new Date();
            const todayStart = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate());
            const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            const groups: { label: string; items: typeof notifs }[] = [];
            const todayN = notifs.filter(n => new Date(n.created_at) >= todayStart);
            const ystN = notifs.filter(n => { const d = new Date(n.created_at); return d >= yesterdayStart && d < todayStart; });
            const oldN = notifs.filter(n => new Date(n.created_at) < yesterdayStart);
            if (todayN.length > 0) groups.push({ label:"Vandaag", items:todayN });
            if (ystN.length > 0) groups.push({ label:"Gisteren", items:ystN });
            if (oldN.length > 0) groups.push({ label:"Eerder", items:oldN });
            return groups.map(group => (
              <div key={group.label}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#8b80b0", margin:"12px 0 6px" }}>{group.label}</p>
                {group.items.map(n => {
                  const notifHref = n.type === "admin_message" ? "/dashboard" : "/rooster";
                  return (
                  <div key={n.id} className={sharedStyles.card} style={{ opacity:n.read?0.72:1, borderLeft:`3px solid ${n.read ? "#2e2a4a" : n.type.includes("open")||n.type.includes("reminder") ? "#ffb547" : "#00e5c3"}`, cursor:"pointer" }}
                    onClick={() => { markRead(n.id); router.push(notifHref); }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:n.read ? "rgba(255,255,255,0.03)" : "rgba(0,229,195,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                        {n.type==="roster_published"?"📅":n.type.includes("reminder")?"⏰":n.type==="open_shift"?"🔓":"📢"}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13, fontWeight:700, color: n.read ? "#8b80b0" : "#f0eeff" }}>{n.title}</p>
                        <p style={{ fontSize:12, color:"#8b80b0", marginTop:2, lineHeight:1.4 }}>{n.message}</p>
                        <p style={{ fontSize:11, color:"#8b80b0", marginTop:6 }}>
                          {new Date(n.created_at).toLocaleTimeString("nl-NL", { hour:"2-digit", minute:"2-digit" })}
                        </p>
                      </div>
                      {!n.read ? (
                        <button onClick={(e) => { e.stopPropagation(); markRead(n.id); }} style={{ flexShrink:0, padding:"4px 10px", borderRadius:20, background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:11, fontWeight:700, cursor:"pointer", alignSelf:"flex-start", marginTop:2 }}>
                          ✓
                        </button>
                      ) : (
                        <span style={{ flexShrink:0, fontSize:14, color:"#2e2a4a", alignSelf:"flex-start", marginTop:2 }}>✓</span>
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
  emailTxt: { fontSize:12, color:"#8b80b0", marginTop:2 },
  tabBar: { display:"flex", borderBottom:"1px solid #2e2a4a", marginBottom:16, marginTop:8, overflowX:"auto" },
  tab: { flex:1, minWidth:70, padding:"10px 4px", background:"none", border:"none", fontFamily:"'Exo 2', sans-serif", fontWeight:700, fontSize:11, cursor:"pointer", textAlign:"center", whiteSpace:"nowrap" },
  savedBanner: { background:"rgba(0,229,195,0.08)", border:"1px solid #00e5c3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#00e5c3", fontWeight:700, textAlign:"center", marginBottom:12 },
  statGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 },
  statCard: { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:16, padding:16, textAlign:"center" },
  statVal: { fontFamily:"monospace", fontSize:28, fontWeight:700, color:"#00e5c3", margin:0 },
  statLabel: { fontSize:10, color:"#8b80b0", letterSpacing:1, textTransform:"uppercase", marginTop:4, margin:0 },
  progressWrap: { background:"#2e2a4a", borderRadius:4, height:6, overflow:"hidden" },
  progressFill: { height:"100%", borderRadius:4, background:"linear-gradient(90deg, #00e5c3, #00b89c)", transition:"width 0.6s ease" },
  avatarSm: { width:30, height:30, borderRadius:8, background:"linear-gradient(135deg, #3b2f6e, #5a4a9e)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#00e5c3", flexShrink:0 },
};
