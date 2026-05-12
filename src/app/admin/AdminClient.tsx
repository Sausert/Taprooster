"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Shift } from "@/types";
import { parseLocalDate, formatDateShort as formatDate } from "@/lib/dates";

const PERIOD_OPTIONS = [{ value:1, label:"Maand" },{ value:3, label:"Kwartaal" },{ value:6, label:"Half jaar" },{ value:12, label:"Heel jaar" }];
const MONTH_NAMES_SHORT = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const MONTH_NAMES_FULL = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const emptyShift = () => ({ role:"tapper" as "tapper"|"bonnenkassa", start_time:"20:00", end_time:"02:00", max_tappers:2 });

type LeaderboardEntry = Profile & { taps_this_year: number; target: number };
type AdminTab = "health"|"tappers"|"rooster"|"publiceer"|"uitnodiging";

function TapBarChart({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const max = Math.max(...leaderboard.map(l => l.taps_this_year || 0), 1);
  return (
    <div style={{ marginTop:8 }}>
      {leaderboard.slice(0,10).map((lb) => {
        const pct = Math.round(((lb.taps_this_year||0)/max)*100);
        const yearTarget = (lb.target||1)*12;
        const goalPct = Math.min(100, Math.round(((lb.taps_this_year||0)/yearTarget)*100));
        return (
          <div key={lb.id} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:12, color:"#e8e0ff", fontWeight:600 }}>{lb.full_name?.split(" ")[0]}</span>
              <span style={{ fontSize:12, fontFamily:"monospace", color:"#00e5c3" }}>{lb.taps_this_year||0}x <span style={{color:"#8b80b0",fontSize:10}}>({goalPct}% v/doel)</span></span>
            </div>
            <div style={{ background:"#2e2a4a", borderRadius:4, height:8, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:4, width:`${pct}%`, background: pct>75?"linear-gradient(90deg,#00e5c3,#00b89c)":pct>40?"linear-gradient(90deg,#ffb547,#e09030)":"linear-gradient(90deg,#5a4a9e,#3b2f6e)", transition:"width 0.6s ease" }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminClient({ shifts: initialShifts, profiles: initialProfiles, leaderboard, publishedShifts: initialPublished }: {
  shifts: Shift[]; profiles: Profile[]; leaderboard: LeaderboardEntry[]; publishedShifts: Shift[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("health");
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [published, setPublished] = useState<Shift[]>(initialPublished);

  // Rooster
  const [rosterView, setRosterView] = useState<"concept"|"published">("published");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });
  const [generating, setGenerating] = useState(false);
  const [conceptShifts, setConceptShifts] = useState<Shift[]>([]);
  const [editingShiftId, setEditingShiftId] = useState<string|null>(null);

  // Feestje
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title:"", date:"", shifts:[emptyShift()] });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventSaved, setEventSaved] = useState(false);

  // Tapper toevoegen aan dienst
  const [addTapperModal, setAddTapperModal] = useState<Shift|null>(null);
  const [tapperSearchModal, setTapperSearchModal] = useState("");
  const [addingTapper, setAddingTapper] = useState<string|null>(null);

  // Tapper bewerken (uitgebreid met voorkeuren)
  const [editingTapper, setEditingTapper] = useState<Profile|null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile> & { first_name?: string; last_name?: string }>({});
  const [editTab, setEditTab] = useState<"info"|"voorkeuren">("info");
  const [savingTapper, setSavingTapper] = useState(false);
  const [tapperSearch, setTapperSearch] = useState("");

  // Standaard diensten configuratie
  const [defaultShifts, setDefaultShifts] = useState({
    wednesday: { enabled:true, start:"19:00", end:"23:00" },
    friday:    { enabled:true, start:"20:00", end:"00:00" },
    saturday:  { enabled:true, start:"20:00", end:"00:00" },
  });

  // Publiceren
  const [publishMsg, setPublishMsg] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Uitnodiging
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const now = new Date();

  // Health
  const underfilled = shifts.filter(s=>(s.assignments||[]).filter((a:any)=>a.status!=="declined").length<s.max_tappers);
  const unconfirmed = shifts.filter(s=>(s.assignments||[]).some((a:any)=>a.status==="assigned"));
  function getHealthColor(shift:any){const n=(shift.assignments||[]).filter((a:any)=>a.status!=="declined").length;return n>=shift.max_tappers?"#00e5c3":n>=shift.max_tappers/2?"#ffb547":"#ff4f6d";}

  // Tapper bewerken
  function openEditTapper(p:any){
    setEditingTapper(p);
    setEditTab("info");
    const nameParts = (p.full_name||"").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    setEditForm({
      first_name:firstName, last_name:lastName,
      full_name:p.full_name||"", email:p.email||"", phone:p.phone||"", role:p.role||"tapper",
      preferred_frequency:p.preferred_frequency||4,
      preferred_days:p.preferred_days||[],
      preferred_roles:p.preferred_roles||["tapper"],
      wants_parties:p.wants_parties||false,
      unavailable_months:p.unavailable_months||[],
    });
  }

  function toggleEditDay(day:string){
    const days = (editForm.preferred_days||[]).includes(day as any)
      ? (editForm.preferred_days||[]).filter((d:string)=>d!==day)
      : [...(editForm.preferred_days||[]), day as any];
    setEditForm((f:any)=>({...f,preferred_days:days}));
  }
  function toggleEditRole(role:string){
    const roles = (editForm.preferred_roles||[]).includes(role as any)
      ? (editForm.preferred_roles||[]).filter((r:string)=>r!==role)
      : [...(editForm.preferred_roles||[]), role as any];
    setEditForm((f:any)=>({...f,preferred_roles:roles}));
  }
  function toggleEditMonth(idx:number){
    const months = (editForm.unavailable_months||[]).includes(idx)
      ? (editForm.unavailable_months||[]).filter((m:number)=>m!==idx)
      : [...(editForm.unavailable_months||[]), idx];
    setEditForm((f:any)=>({...f,unavailable_months:months}));
  }

  async function saveTapper(){
    if(!editingTapper) return;
    setSavingTapper(true);
    const saveData = {
      ...editForm,
      full_name: `${editForm.first_name} ${editForm.last_name}`.trim(),
    };
    const res = await fetch(`/api/admin/tappers/${editingTapper.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(saveData)});
    if(res.ok){
      const data = await res.json();
      setProfiles(ps=>ps.map(p=>p.id===editingTapper.id?{...p,...data.data}:p));
    }
    setSavingTapper(false);
    setEditingTapper(null);
  }

  async function resetStats(tapperId:string, tapperName:string){
    if(!confirm(`Statistieken van ${tapperName} resetten? Dit verwijdert alle tapregistraties van dit jaar.`)) return;
    const res = await fetch(`/api/admin/tappers/${tapperId}/reset-stats`,{method:"POST"});
    if(res.ok){
      alert(`✅ Statistieken van ${tapperName} gereset.`);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`❌ Resetten mislukt: ${data.error ?? "Probeer opnieuw."}`);
    }
  }

  async function deleteTapper(tapperId:string, tapperName:string){
    if(!confirm(`Weet je zeker dat je ${tapperName} wilt verwijderen? Dit kan niet ongedaan worden.`)) return;
    const res = await fetch(`/api/admin/tappers/${tapperId}/delete`,{method:"DELETE"});
    if(res.ok){
      setProfiles(ps=>ps.filter(p=>p.id!==tapperId));
      alert(`✅ ${tapperName} is verwijderd.`);
    } else {
      const data = await res.json();
      alert(`❌ ${data.error}`);
    }
  }

  // Tapper toevoegen aan dienst
  async function handleAddTapper(shiftId:string, userId:string){
    setAddingTapper(userId);
    const res = await fetch(`/api/shifts/${shiftId}/assign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"claim",targetUserId:userId})});
    if(res.ok){
      const tapper = profiles.find(p=>p.id===userId);
      const updateList=(list:any[])=>list.map(s=>s.id===shiftId?{...s,assignments:[...(s.assignments||[]),{user_id:userId,status:"assigned",profile:tapper}]}:s);
      setPublished(updateList); setConceptShifts(updateList); setShifts(updateList);
    }
    setAddingTapper(null); setAddTapperModal(null); setTapperSearchModal("");
  }

  // Tapper verwijderen van dienst
  async function handleRemoveTapper(shiftId:string, userId:string){
    const res = await fetch(`/api/admin/shifts/${shiftId}/remove-tapper`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    if(res.ok){
      const updateList=(list:any[])=>list.map(s=>s.id===shiftId?{...s,assignments:(s.assignments||[]).filter((a:any)=>a.user_id!==userId)}:s);
      setPublished(updateList); setConceptShifts(updateList); setShifts(updateList);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`❌ Verwijderen mislukt: ${data.error ?? "Probeer opnieuw."}`);
    }
  }

  // Dienst verwijderen
  async function handleDeleteShift(shiftId:string, source:"concept"|"published"){
    if(!confirm("Weet je zeker dat je deze dienst wilt verwijderen?")) return;
    const res = await fetch(`/api/admin/shifts/${shiftId}/delete`,{method:"DELETE"});
    if(res.ok){
      if(source==="published") setPublished(ps=>ps.filter(s=>s.id!==shiftId));
      else setConceptShifts(cs=>cs.filter(s=>s.id!==shiftId));
      setShifts(ss=>ss.filter(s=>s.id!==shiftId));
    }
  }

  // Feestje
  function addShiftToEvent(){setEventForm(f=>({...f,shifts:[...f.shifts,emptyShift()]}));}
  function removeShiftFromEvent(idx:number){setEventForm(f=>({...f,shifts:f.shifts.filter((_:any,i:number)=>i!==idx)}));}
  function updateEventShift(idx:number,field:string,value:any){setEventForm(f=>({...f,shifts:f.shifts.map((s:any,i:number)=>i===idx?{...s,[field]:value}:s)}));}
  async function handleCreateEvent(e:React.FormEvent){
    e.preventDefault(); setSavingEvent(true);
    const res = await fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(eventForm)});
    const data = await res.json();
    if(res.ok){setEventSaved(true);setShowEventForm(false);setEventForm({title:"",date:"",shifts:[emptyShift()]});if(data.data?.shifts)setConceptShifts(cs=>[...cs,...data.data.shifts]);setTimeout(()=>setEventSaved(false),3000);}
    setSavingEvent(false);
  }

  // Rooster genereren
  async function handleGenerate(){
    if (!dateFrom || !dateTo) { alert("Selecteer een van- en tot-datum."); return; }
    if (dateFrom > dateTo) { alert("De startdatum moet voor de einddatum liggen."); return; }
    setGenerating(true);
    const res = await fetch("/api/schedule",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dateFrom,dateTo,defaultShifts})});
    const data = await res.json();
    if (data.error) { alert("❌ " + data.error); setGenerating(false); return; }
    if(data.data?.shifts){
      setConceptShifts(data.data.shifts);
      setRosterView("concept");
    } else {
      alert("Geen nieuwe diensten aangemaakt (mogelijk al bestaande concepten in deze periode).");
    }
    setGenerating(false);
  }

  function updateShiftInList(id:string,field:string,value:any,list:any[],setList:(v:any[])=>void){setList(list.map(s=>s.id===id?{...s,[field]:value}:s));}
  async function saveShiftEdit(shift:any){
    const res = await fetch(`/api/shifts/${shift.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:shift.title,start_time:shift.start_time,end_time:shift.end_time,max_tappers:shift.max_tappers,admin_note:shift.admin_note})});
    if(!res.ok){
      const data = await res.json().catch(() => ({}));
      alert(`❌ Opslaan mislukt: ${data.error ?? "Probeer opnieuw."}`);
      return;
    }
    setEditingShiftId(null);
  }

  // Publiceren
  async function handlePublish(){
    setPublishing(true);
    const res = await fetch("/api/schedule/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dateFrom,dateTo,message:publishMsg})});
    if(res.ok){
      const data = await res.json();
      alert(`🚀 Rooster gepubliceerd! ${data.data?.notified||0} tappers genotificeerd.`);
      setConceptShifts([]); setPublishMsg("");
    } else { alert("❌ Publiceren mislukt."); }
    setPublishing(false);
  }

  // Uitnodiging
  async function handleCreateInvite(){
    setInviteLoading(true);
    const res = await fetch("/api/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:inviteEmail||undefined})});
    const data = await res.json();
    if(data.data){setInviteUrl(data.data.url);setQrCode(data.data.qrCode);}
    setInviteLoading(false);
  }

  const filteredProfiles = profiles.filter(p=>p.full_name?.toLowerCase().includes(tapperSearch.toLowerCase())||p.email?.toLowerCase().includes(tapperSearch.toLowerCase()));
  const filteredModalProfiles = profiles.filter(p => {
    if (!p.full_name?.toLowerCase().includes(tapperSearchModal.toLowerCase())) return false;
    // Only show tappers available for the shift date
    if (!addTapperModal) return true;
    const shiftDate = addTapperModal.date;
    if (!shiftDate) return true;
    // Check unavailable months
    const monthIdx = new Date(shiftDate.split("-").map(Number)[0], shiftDate.split("-").map(Number)[1]-1, 1).getMonth();
    if ((p.unavailable_months||[]).includes(monthIdx)) return false;
    // Check preferred days
    const dow = (()=>{const [y,m,d]=shiftDate.split("-").map(Number);return new Date(y,m-1,d).getDay();})();
    const dayMap:Record<number,string> = {3:"wednesday",5:"friday",6:"saturday"};
    const shiftDay = dayMap[dow];
    if (shiftDay && (p.preferred_days||[]).length > 0 && !(p.preferred_days||[]).includes(shiftDay as any)) return false;
    // Check party preference
    if (addTapperModal.type === "feestje" && !p.wants_parties) return false;
    return true;
  });

  // ShiftCard component
  const ShiftCard = ({ shift, source }: { shift:any; source:"concept"|"published" }) => {
    const isEditing = editingShiftId===shift.id;
    const setList = source==="concept" ? setConceptShifts : setPublished;
    const list = source==="concept" ? conceptShifts : published;
    const assigned = (shift.assignments||[]).filter((a:any)=>a.status!=="declined");
    const open = shift.max_tappers - assigned.length;
    const accentColor = shift.type==="feestje" ? "#3b82f6" : "#00e5c3";
    return (
      <div style={{background:"#1a1730",borderLeft:`3px solid ${accentColor}`,borderTop:"1px solid #2e2a4a",borderRight:"1px solid #2e2a4a",borderBottom:"1px solid #2e2a4a",borderRadius:16,padding:16,marginBottom:10}}>
        {isEditing ? (
          <div>
            <label style={s.label}>Naam dienst</label>
            <input style={s.input} value={shift.title} onChange={e=>updateShiftInList(shift.id,"title",e.target.value,list,setList)}/>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1}}><label style={s.label}>Start</label><input style={{...s.input,marginBottom:0}} value={shift.start_time} onChange={e=>updateShiftInList(shift.id,"start_time",e.target.value,list,setList)}/></div>
              <div style={{flex:1}}><label style={s.label}>Eind</label><input style={{...s.input,marginBottom:0}} value={shift.end_time} onChange={e=>updateShiftInList(shift.id,"end_time",e.target.value,list,setList)}/></div>
            </div>
            <label style={s.label}>Max tappers</label>
            <input style={{...s.input,width:80}} type="number" min={1} max={20} value={shift.max_tappers} onChange={e=>updateShiftInList(shift.id,"max_tappers",Number(e.target.value),list,setList)}/>
            <label style={s.label}>Notitie</label>
            <input style={s.input} value={shift.admin_note||""} onChange={e=>updateShiftInList(shift.id,"admin_note",e.target.value,list,setList)} placeholder="Optionele notitie..."/>
            <div style={{display:"flex",gap:8}}>
              <button style={{...s.btnPrimary,flex:1,padding:"10px"}} onClick={()=>saveShiftEdit(shift)}>💾 Opslaan</button>
              <button style={{...s.btnSecondary,flex:1,padding:"10px"}} onClick={()=>setEditingShiftId(null)}>Annuleer</button>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <p style={{fontSize:14,fontWeight:700,color:"#f0eeff"}}>{shift.title}</p>
                {shift.type==="feestje"&&<span style={s.blueBadge}>Feestje</span>}
                {shift.role==="bonnenkassa"&&<span style={s.purpleBadge}>Kassa</span>}
              </div>
              <p style={{fontSize:12,color:"#8b80b0"}}>{formatDate(shift.date)} · {shift.start_time}–{shift.end_time}</p>
              <p style={{fontSize:11,color:open>0?"#ffb547":"#00e5c3",marginTop:2}}>{assigned.length}/{shift.max_tappers}{open>0?` · ${open} open`:""}</p>
              {shift.admin_note&&<p style={{fontSize:11,color:"#3b82f6",marginTop:4}}>📌 {shift.admin_note}</p>}
              <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>
                {assigned.map((a:any)=>(
                  <div key={a.user_id} style={{display:"flex",alignItems:"center",gap:4,background:"#221f38",borderRadius:20,padding:"3px 8px 3px 10px",border:"1px solid #2e2a4a"}}>
                    <span style={{fontSize:12,color:"#e8e0ff"}}>{a.profile?.full_name?.split(" ")[0]||"?"}</span>
                    <button style={{background:"none",border:"none",color:"#ff4f6d",cursor:"pointer",fontSize:13,padding:"0 2px",lineHeight:1}} onClick={()=>handleRemoveTapper(shift.id,a.user_id)}>✕</button>
                  </div>
                ))}
                {open>0&&<button style={s.addTapperBtn} onClick={()=>setAddTapperModal(shift)}>+ Tapper</button>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginLeft:10}}>
              <button style={s.iconBtn} onClick={()=>setEditingShiftId(shift.id)}>✏️</button>
              <button style={{...s.iconBtn,color:"#ff4f6d"}} onClick={()=>handleDeleteShift(shift.id,source)}>🗑</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const TABS = [{id:"health",label:"📊 Status"},{id:"tappers",label:"👥 Tappers"},{id:"rooster",label:"📅 Rooster"},{id:"publiceer",label:"🚀 Publiceer"},{id:"uitnodiging",label:"🔗 Uitnodiging"}];

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#0f0d1a"}}>
      <div style={s.header}>
        <button onClick={()=>router.push("/account")} style={s.back}>←</button>
        <span style={s.headerTitle}>Admin Dashboard</span>
        <div style={{width:28}}/>
      </div>
      <div style={s.tabBar}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as AdminTab)} style={{...s.tabBtn,color:tab===t.id?"#00e5c3":"#8b80b0",borderBottom:`2px solid ${tab===t.id?"#00e5c3":"transparent"}`,fontWeight:tab===t.id?900:600}}>{t.label}</button>
        ))}
      </div>
      <div style={s.content}>

        {/* ── STATUS ── */}
        {tab==="health"&&(
          <>
            <div style={s.statGrid}>
              <div style={s.statCard}><p style={{...s.statVal,color:"#ff4f6d"}}>{underfilled.length}</p><p style={s.statLabel}>Onderbezet</p></div>
              <div style={s.statCard}><p style={{...s.statVal,color:"#ffb547"}}>{unconfirmed.length}</p><p style={s.statLabel}>Onbevestigd</p></div>
            </div>
            <p style={s.sectionTitle}>Dienststatus</p>
            <div style={s.card}>
              {shifts.length===0&&(
                <div style={{textAlign:"center", padding:"32px 20px"}}>
                  <div style={{fontSize:36, marginBottom:8}}>📅</div>
                  <p style={{fontSize:13, fontWeight:700, color:"#f0eeff", margin:0}}>Geen diensten</p>
                  <p style={{fontSize:12, color:"#8b80b0", marginTop:4}}>Er zijn nog geen diensten aangemaakt.</p>
                </div>
              )}
              {shifts.map(shift=>{
                const color=getHealthColor(shift);
                const assigned=(shift.assignments||[]).filter((a:any)=>a.status!=="declined").length;
                const confirmed=(shift.assignments||[]).filter((a:any)=>a.status==="confirmed").length;
                return(
                  <div key={shift.id} style={s.healthRow}>
                    <div style={{width:10,height:10,borderRadius:"50%",flexShrink:0,background:color,boxShadow:`0 0 6px ${color}`}}/>
                    <div style={{flex:1}}>
                      <p style={{fontSize:13,fontWeight:600,color:"#e8e0ff"}}>{formatDate(shift.date)} — {shift.title}</p>
                      <p style={{fontSize:11,color}}>{assigned}/{shift.max_tappers} bezet · {confirmed} bevestigd</p>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {assigned<shift.max_tappers&&<span style={s.dangerBadge}>{shift.max_tappers-assigned} open</span>}
                      {assigned<shift.max_tappers&&<button style={s.addTapperBtn} onClick={()=>setAddTapperModal(shift)}>+ Tapper</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={s.sectionTitle}>🍺 Tapscore dit jaar</p>
            <div style={s.card}><TapBarChart leaderboard={leaderboard}/></div>
          </>
        )}

        {/* ── TAPPERS ── */}
        {tab==="tappers"&&(
          <>
            <p style={s.sectionTitle}>Alle tappers ({profiles.length})</p>
            <input style={s.input} placeholder="🔍 Zoek op naam of e-mail..." value={tapperSearch} onChange={e=>setTapperSearch(e.target.value)}/>
            {filteredProfiles.map(p=>{
              const lb=leaderboard.find(l=>l.id===p.id);
              return(
                <div key={p.id} style={s.card}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={s.avatar}>{p.full_name?.split(" ").map((n:string)=>n[0]).join("").slice(0,2)||"?"}</div>
                    <div style={{flex:1}}>
                      <p style={{fontSize:14,fontWeight:700,color:"#e8e0ff"}}>{p.full_name}</p>
                      <p style={{fontSize:11,color:"#8b80b0"}}>{p.email}{p.phone?` · ${p.phone}`:""}</p>
                      <p style={{fontSize:11,color:"#8b80b0"}}>{lb?.taps_this_year||0}x getapt · doel: {p.preferred_frequency}x/mnd</p>
                    </div>
                    <div style={{display:"flex",gap:6,flexDirection:"column",alignItems:"flex-end"}}>
                      {p.role==="admin"&&<span style={s.mintBadge}>Admin</span>}
                      <button style={s.editBtn} onClick={()=>openEditTapper(p)}>✏️ Bewerken</button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Edit tapper modal - uitgebreid */}
            {editingTapper&&(
              <div style={s.overlay} onClick={()=>setEditingTapper(null)}>
                <div style={{...s.sheet,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                  <div style={s.sheetHandle}/>
                  <p style={s.sheetTitle}>{editingTapper.full_name} bewerken</p>

                  {/* Sub-tabs */}
                  <div style={{display:"flex",borderBottom:"1px solid #2e2a4a",marginBottom:16}}>
                    {[["info","👤 Info"],["voorkeuren","⚙️ Voorkeuren"]].map(([id,label])=>(
                      <button key={id} onClick={()=>setEditTab(id as any)} style={{flex:1,padding:"8px",background:"none",border:"none",fontFamily:"'Exo 2',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",color:editTab===id?"#00e5c3":"#8b80b0",borderBottom:`2px solid ${editTab===id?"#00e5c3":"transparent"}`}}>{label}</button>
                    ))}
                  </div>

                  {editTab==="info"&&(
                    <>
                      <div style={{display:"flex",gap:10}}>
                        <div style={{flex:1}}>
                          <label style={s.label}>Voornaam</label>
                          <input style={s.input} value={editForm.first_name||""} onChange={e=>setEditForm((f:any)=>({...f,first_name:e.target.value}))} placeholder="Voornaam"/>
                        </div>
                        <div style={{flex:1}}>
                          <label style={s.label}>Achternaam</label>
                          <input style={s.input} value={editForm.last_name||""} onChange={e=>setEditForm((f:any)=>({...f,last_name:e.target.value}))} placeholder="Achternaam"/>
                        </div>
                      </div>
                      <label style={s.label}>E-mailadres</label>
                      <input style={s.input} type="email" value={editForm.email} onChange={e=>setEditForm((f:any)=>({...f,email:e.target.value}))}/>
                      <label style={s.label}>Telefoonnummer</label>
                      <input style={s.input} type="tel" value={editForm.phone} onChange={e=>setEditForm((f:any)=>({...f,phone:e.target.value}))} placeholder="+31 6 12345678"/>
                      <label style={s.label}>Rol(len)</label>
                      <p style={{fontSize:11,color:"#8b80b0",marginBottom:8}}>Meerdere rollen mogelijk</p>
                      <div style={{display:"flex",gap:8,marginBottom:16}}>
                        {[["tapper","🍺 Tapper"],["admin","⚡ Admin"]].map(([r,l])=>{
                          const roles = Array.isArray((editForm as any).roles) ? (editForm as any).roles : [editForm.role||"tapper"];
                          const active = roles.includes(r);
                          return (
                            <div key={r} style={{...s.chip,...(active?s.chipActive:{}),flex:1,textAlign:"center"}} onClick={()=>{
                              const current = Array.isArray((editForm as any).roles) ? (editForm as any).roles : [editForm.role||"tapper"];
                              const newRoles = active ? current.filter((x:string)=>x!==r) : [...current,r];
                              if(newRoles.length===0) return; // at least one role
                              setEditForm((f:any)=>({...f,roles:newRoles,role:newRoles.includes("admin")?"admin":"tapper"}));
                            }}>{l}</div>
                          );
                        })}
                      </div>
                      {/* Danger zone */}
                      <div style={{borderTop:"1px solid #2e2a4a",paddingTop:16,marginTop:8}}>
                        <p style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"#ff4f6d",textTransform:"uppercase",marginBottom:10}}>⚠️ Danger zone</p>
                        <button style={{...s.btnSecondary,color:"#ffb547",borderColor:"#ffb547",marginBottom:8}} onClick={()=>resetStats(editingTapper.id,editingTapper.full_name)}>
                          🔄 Statistieken resetten
                        </button>
                        <button style={{...s.btnSecondary,color:"#ff4f6d",borderColor:"#ff4f6d"}} onClick={()=>deleteTapper(editingTapper.id,editingTapper.full_name)}>
                          🗑 Tapper verwijderen
                        </button>
                      </div>
                    </>
                  )}

                  {editTab==="voorkeuren"&&(
                    <>
                      <label style={s.label}>Tapfrequentie per maand</label>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <input type="range" min={1} max={20} value={editForm.preferred_frequency}
                          onChange={e=>setEditForm((f:any)=>({...f,preferred_frequency:Number(e.target.value)}))}
                          style={{flex:1,accentColor:"#00e5c3",marginRight:12}}/>
                        <span style={{fontFamily:"monospace",fontSize:18,color:"#00e5c3",minWidth:40}}>{editForm.preferred_frequency}x</span>
                      </div>
                      <label style={s.label}>Voorkeursdagen</label>
                      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                        {[["wednesday","Wo"],["friday","Vr"],["saturday","Za"]].map(([v,l])=>(
                          <div key={v} style={{...s.chip,...((editForm.preferred_days||[]).includes(v as any)?s.chipActive:{}),flex:1,textAlign:"center"}} onClick={()=>toggleEditDay(v)}>{l}</div>
                        ))}
                      </div>
                      <label style={s.label}>Voorkeursdiensten</label>
                      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                        {[["tapper","🍺 Tappen"],["bonnenkassa","🎟 Kassa"]].map(([v,l])=>(
                          <div key={v} style={{...s.chip,...((editForm.preferred_roles||[]).includes(v as any)?s.chipActive:{}),flex:1,textAlign:"center"}} onClick={()=>toggleEditRole(v)}>{l}</div>
                        ))}
                        <div style={{...s.chip,...(editForm.wants_parties?s.chipActive:{}),flex:1,textAlign:"center"}} onClick={()=>setEditForm((f:any)=>({...f,wants_parties:!f.wants_parties}))}>🎉 Feestjes</div>
                      </div>
                      <label style={s.label}>Niet beschikbaar in</label>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
                        {MONTH_NAMES_SHORT.map((name,idx)=>(
                          <div key={idx} style={{...s.chip,...((editForm.unavailable_months||[]).includes(idx)?s.chipUnavailable:{}),textAlign:"center",padding:"6px 4px",fontSize:11}} onClick={()=>toggleEditMonth(idx)}>{name}</div>
                        ))}
                      </div>
                    </>
                  )}

                  <button style={s.btnPrimary} onClick={saveTapper} disabled={savingTapper}>{savingTapper?"Opslaan...":"💾 Opslaan"}</button>
                  <button style={{...s.btnSecondary,marginTop:8}} onClick={()=>setEditingTapper(null)}>Annuleren</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ROOSTER ── */}
        {tab==="rooster"&&(
          <>
            {eventSaved&&<div style={s.savedBanner}>✅ Feestje aangemaakt!</div>}
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {(["published","concept"] as const).map(v=>(
                <button key={v} onClick={()=>setRosterView(v)} style={{flex:1,padding:"10px",borderRadius:10,fontFamily:"'Exo 2',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",background:rosterView===v?"rgba(0,229,195,0.1)":"#221f38",color:rosterView===v?"#00e5c3":"#8b80b0",borderWidth:1,borderStyle:"solid",borderColor:rosterView===v?"#00e5c3":"#2e2a4a"}}>
                  {v==="published"?"📋 Gepubliceerd":"🗒 Concept"}
                </button>
              ))}
            </div>

            {rosterView==="published"&&(
              <>
                <p style={s.sectionTitle}>Gepubliceerd rooster — aanpasbaar</p>
                {published.length===0&&(
                  <div style={{textAlign:"center", padding:"32px 20px"}}>
                    <div style={{fontSize:36, marginBottom:8}}>📅</div>
                    <p style={{fontSize:13, fontWeight:700, color:"#f0eeff", margin:0}}>Geen diensten</p>
                    <p style={{fontSize:12, color:"#8b80b0", marginTop:4}}>Er zijn nog geen diensten aangemaakt.</p>
                  </div>
                )}
                {published.map(shift=><ShiftCard key={shift.id} shift={shift} source="published"/>)}
              </>
            )}

            {rosterView==="concept"&&(
              <>
                <button style={{...s.btnPrimary,marginBottom:12}} onClick={()=>setShowEventForm(true)}>🎉 Feestje / evenement aanmaken</button>
                <p style={s.sectionTitle}>Tapavonden genereren</p>
                <div style={s.card}>
                  <div style={{display:"flex",gap:10,marginBottom:14}}>
                    <div style={{flex:1}}>
                      <label style={s.label}>Van</label>
                      <input type="date" style={s.input} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
                    </div>
                    <div style={{flex:1}}>
                      <label style={s.label}>Tot en met</label>
                      <input type="date" style={s.input} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
                    </div>
                  </div>
                  <button style={s.btnSecondary} onClick={handleGenerate} disabled={generating}>{generating?"⏳ Genereren...":"🤖 Genereer conceptrooster"}</button>
                </div>

                <p style={s.sectionTitle}>Standaard tapavonden</p>
                <div style={s.card}>
                  <p style={{fontSize:12,color:"#8b80b0",marginBottom:12}}>Pas de standaardinstellingen aan die gebruikt worden bij het genereren.</p>
                  {(["wednesday","friday","saturday"] as const).map(day => {
                    const labels:Record<string,string> = {wednesday:"Woensdag",friday:"Vrijdag",saturday:"Zaterdag"};
                    const cfg = defaultShifts[day];
                    return (
                      <div key={day} style={{borderBottom:"1px solid #2e2a4a",paddingBottom:12,marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:cfg.enabled?10:0}}>
                          <span style={{fontSize:13,fontWeight:700,color:cfg.enabled?"#e8e0ff":"#8b80b0"}}>{labels[day]}</span>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:11,color:"#8b80b0"}}>{cfg.enabled?"Aan":"Uit"}</span>
                            <div onClick={()=>setDefaultShifts(d=>({...d,[day]:{...d[day],enabled:!d[day].enabled}}))}
                              style={{width:40,height:22,borderRadius:11,background:cfg.enabled?"#00e5c3":"#2e2a4a",cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                              <div style={{position:"absolute",top:3,left:cfg.enabled?20:3,width:16,height:16,borderRadius:"50%",background:"white",transition:"left 0.2s"}}/>
                            </div>
                          </div>
                        </div>
                        {cfg.enabled && (
                          <div style={{display:"flex",gap:8}}>
                            <div style={{flex:1}}>
                              <label style={{...s.label,fontSize:10}}>Start</label>
                              <input style={{...s.input,marginBottom:0,padding:"8px 10px",fontSize:13}} type="time" value={cfg.start} onChange={e=>setDefaultShifts(d=>({...d,[day]:{...d[day],start:e.target.value}}))}/>
                            </div>
                            <div style={{flex:1}}>
                              <label style={{...s.label,fontSize:10}}>Eind</label>
                              <input style={{...s.input,marginBottom:0,padding:"8px 10px",fontSize:13}} type="time" value={cfg.end} onChange={e=>setDefaultShifts(d=>({...d,[day]:{...d[day],end:e.target.value}}))}/>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {conceptShifts.length>0&&(
                  <>
                    <p style={s.sectionTitle}>Conceptrooster ({conceptShifts.length} diensten)</p>
                    {conceptShifts.map(shift=><ShiftCard key={shift.id} shift={shift} source="concept"/>)}
                    <div style={{...s.card,borderColor:"#00e5c3",marginTop:8}}>
                      <p style={{fontSize:13,color:"#8b80b0",marginBottom:12}}>Tevreden? Zet het rooster live via "Publiceer".</p>
                      <button style={s.btnPrimary} onClick={()=>setTab("publiceer")}>🚀 Ga naar publiceren →</button>
                    </div>
                  </>
                )}
                {conceptShifts.length===0&&!generating&&(
                  <div style={{textAlign:"center", padding:"32px 20px"}}>
                    <div style={{fontSize:36, marginBottom:8}}>📅</div>
                    <p style={{fontSize:13, fontWeight:700, color:"#f0eeff", margin:0}}>Geen diensten</p>
                    <p style={{fontSize:12, color:"#8b80b0", marginTop:4}}>Er zijn nog geen diensten aangemaakt.</p>
                  </div>
                )}
              </>
            )}

            {/* Feestje modal */}
            {showEventForm&&(
              <div style={s.overlay} onClick={()=>setShowEventForm(false)}>
                <div style={{...s.sheet,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                  <div style={s.sheetHandle}/>
                  <p style={s.sheetTitle}>🎉 Feestje aanmaken</p>
                  <form onSubmit={handleCreateEvent}>
                    <label style={s.label}>Naam</label>
                    <input style={s.input} value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))} placeholder="Bijv. Oud & Nieuw..." required/>
                    <label style={s.label}>Datum</label>
                    <input style={s.input} type="date" value={eventForm.date} onChange={e=>setEventForm(f=>({...f,date:e.target.value}))} required/>
                    <p style={{...s.sectionTitle,marginTop:16}}>Diensten</p>
                    {eventForm.shifts.map((shift:any,idx:number)=>(
                      <div key={idx} style={s.card}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <p style={{fontSize:13,fontWeight:700,color:"#e8e0ff"}}>Dienst {idx+1}</p>
                          {eventForm.shifts.length>1&&<button type="button" style={{...s.iconBtn,color:"#ff4f6d"}} onClick={()=>removeShiftFromEvent(idx)}>🗑</button>}
                        </div>
                        <div style={{display:"flex",gap:8,marginBottom:12}}>
                          {(["tapper","bonnenkassa"] as const).map(r=>(
                            <div key={r} style={{flex:1,textAlign:"center",padding:"8px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",textTransform:"uppercase",background:shift.role===r?"rgba(0,229,195,0.1)":"#221f38",color:shift.role===r?"#00e5c3":"#8b80b0",borderWidth:1,borderStyle:"solid",borderColor:shift.role===r?"#00e5c3":"#2e2a4a"}} onClick={()=>updateEventShift(idx,"role",r)}>
                              {r==="bonnenkassa"?"🎟 Kassa":"🍺 Tapper"}
                            </div>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:8,marginBottom:12}}>
                          <div style={{flex:1}}><label style={s.label}>Start</label><input style={{...s.input,marginBottom:0}} value={shift.start_time} onChange={e=>updateEventShift(idx,"start_time",e.target.value)} required/></div>
                          <div style={{flex:1}}><label style={s.label}>Eind</label><input style={{...s.input,marginBottom:0}} value={shift.end_time} onChange={e=>updateEventShift(idx,"end_time",e.target.value)} required/></div>
                        </div>
                        <label style={s.label}>Aantal tappers</label>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <button type="button" style={{...s.iconBtn,fontSize:18}} onClick={()=>updateEventShift(idx,"max_tappers",Math.max(1,shift.max_tappers-1))}>−</button>
                          <span style={{fontFamily:"monospace",fontSize:22,color:"#00e5c3",minWidth:32,textAlign:"center"}}>{shift.max_tappers}</span>
                          <button type="button" style={{...s.iconBtn,fontSize:18}} onClick={()=>updateEventShift(idx,"max_tappers",Math.min(20,shift.max_tappers+1))}>+</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" style={{...s.btnSecondary,marginBottom:12}} onClick={addShiftToEvent}>+ Dienst toevoegen</button>
                    <button type="submit" style={s.btnPrimary} disabled={savingEvent}>{savingEvent?"Aanmaken...":"✅ Feestje aanmaken"}</button>
                    <button type="button" style={{...s.btnSecondary,marginTop:8}} onClick={()=>setShowEventForm(false)}>Annuleren</button>
                  </form>
                </div>
              </div>
            )}

            {/* Tapper toevoegen modal */}
            {addTapperModal&&(
              <div style={s.overlay} onClick={()=>setAddTapperModal(null)}>
                <div style={s.sheet} onClick={e=>e.stopPropagation()}>
                  <div style={s.sheetHandle}/>
                  <p style={s.sheetTitle}>Tapper toevoegen</p>
                  <p style={{fontSize:13,color:"#8b80b0",marginBottom:12}}>{addTapperModal.title} · {formatDate(addTapperModal.date)}</p>
                  <input style={s.input} placeholder="🔍 Zoek tapper..." value={tapperSearchModal} onChange={e=>setTapperSearchModal(e.target.value)} autoFocus/>
                  <div style={{maxHeight:280,overflowY:"auto"}}>
                    {filteredModalProfiles
                      .filter(p=>!(addTapperModal.assignments||[]).some((a:any)=>a.user_id===p.id&&a.status!=="declined"))
                      .map(p=>(
                        <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #2e2a4a"}}>
                          <div style={s.avatar}>{p.full_name?.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}</div>
                          <div style={{flex:1}}>
                            <p style={{fontSize:14,fontWeight:600,color:"#e8e0ff"}}>{p.full_name}</p>
                            <p style={{fontSize:11,color:"#8b80b0"}}>{p.email}</p>
                          </div>
                          <button style={{...s.btnPrimary,width:"auto",padding:"8px 14px",fontSize:12}} disabled={addingTapper===p.id} onClick={()=>handleAddTapper(addTapperModal.id,p.id)}>
                            {addingTapper===p.id?"...":"+ Voeg toe"}
                          </button>
                        </div>
                    ))}
                  </div>
                  <button style={{...s.btnSecondary,marginTop:12}} onClick={()=>setAddTapperModal(null)}>Sluiten</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PUBLICEER ── */}
        {tab==="publiceer"&&(
          <>
            <p style={s.sectionTitle}>Rooster publiceren</p>
            <div style={s.card}>
              <p style={{fontSize:13,color:"#8b80b0",marginBottom:12}}>Alle concept-diensten worden live gezet. Tappers ontvangen notificatie + e-mail.</p>
              <label style={s.label}>Begeleidend bericht (optioneel)</label>
              <textarea style={{...s.input,resize:"none",minHeight:80,lineHeight:1.6}} placeholder="Bijv. 'Let op: mei is extra druk!'" value={publishMsg} onChange={e=>setPublishMsg(e.target.value)}/>
              <button style={s.btnPrimary} onClick={handlePublish} disabled={publishing}>{publishing?"⏳ Publiceren...":"🚀 Rooster live zetten"}</button>
            </div>
          </>
        )}

        {/* ── UITNODIGING ── */}
        {tab==="uitnodiging"&&(
          <>
            <p style={s.sectionTitle}>Nieuwe uitnodiging</p>
            <div style={s.card}>
              <label style={s.label}>Stuur direct per e-mail (optioneel)</label>
              <input style={s.input} type="email" placeholder="e-mailadres" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/>
              <button style={s.btnPrimary} onClick={handleCreateInvite} disabled={inviteLoading}>{inviteLoading?"Genereren...":"🔗 Genereer uitnodigingslink"}</button>
            </div>
            {inviteUrl&&(
              <>
                <p style={s.sectionTitle}>Uitnodigingslink</p>
                <div style={s.card}>
                  <div style={{background:"#0f0d1a",borderRadius:10,padding:"10px 12px",fontFamily:"monospace",fontSize:11,color:"#00e5c3",wordBreak:"break-all",marginBottom:10}}>{inviteUrl}</div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteUrl); setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2000); }}
                    style={{ padding:"8px 16px", borderRadius:12, background: copiedInvite ? "rgba(0,229,195,0.15)" : "#221f38", border:"1px solid #00e5c3", color:"#00e5c3", fontSize:13, fontWeight:700, cursor:"pointer", width:"100%", marginTop:8 }}
                  >
                    {copiedInvite ? "✅ Gekopieerd!" : "📋 Kopieer link"}
                  </button>
                </div>
                {qrCode&&(
                  <>
                    <p style={s.sectionTitle}>QR Code</p>
                    <div style={{borderWidth:2,borderStyle:"dashed",borderColor:"#00e5c3",borderRadius:16,padding:24,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                      <img src={qrCode} alt="QR Code" style={{width:160,height:160,borderRadius:10}}/>
                      <a href={qrCode} download="walhalla-invite-qr.png" style={{...s.btnSecondary,padding:"10px 20px",width:"auto"}}>⬇️ Download QR</a>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",background:"rgba(15,13,26,0.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid #2e2a4a",position:"sticky",top:0,zIndex:50},
  back:{background:"none",border:"none",color:"#00e5c3",fontSize:22,cursor:"pointer",padding:0,width:28},
  headerTitle:{fontSize:14,fontWeight:700,color:"#f0eeff",letterSpacing:1,fontFamily:"'Exo 2', sans-serif"},
  tabBar:{display:"flex",borderBottom:"1px solid #2e2a4a",background:"#0f0d1a",overflowX:"auto"},
  tabBtn:{flex:1,minWidth:80,padding:"10px 6px",background:"none",border:"none",fontFamily:"'Exo 2', sans-serif",fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"},
  content:{flex:1,overflowY:"auto",padding:"16px 16px 40px"},
  sectionTitle:{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#8b80b0",margin:"16px 0 8px"},
  card:{background:"#1a1730",border:"1px solid #2e2a4a",borderRadius:16,padding:16,marginBottom:10},
  statGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4},
  statCard:{background:"#1a1730",border:"1px solid #2e2a4a",borderRadius:14,padding:16,textAlign:"center"},
  statVal:{fontFamily:"monospace",fontSize:30,fontWeight:700,margin:0},
  statLabel:{fontSize:10,color:"#8b80b0",letterSpacing:1,textTransform:"uppercase",marginTop:4,margin:0},
  healthRow:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #2e2a4a"},
  dangerBadge:{fontSize:11,padding:"2px 8px",borderRadius:10,background:"rgba(255,79,109,0.1)",color:"#ff4f6d",border:"1px solid #ff4f6d"},
  mintBadge:{fontSize:11,padding:"3px 8px",borderRadius:10,background:"rgba(0,229,195,0.1)",color:"#00e5c3",border:"1px solid #00e5c3"},
  blueBadge:{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(59,130,246,0.1)",color:"#3b82f6",border:"1px solid #3b82f6"},
  purpleBadge:{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(90,74,158,0.2)",color:"#a896ff",border:"1px solid #5a4a9e"},
  savedBanner:{background:"rgba(0,229,195,0.08)",border:"1px solid #00e5c3",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#00e5c3",fontWeight:700,textAlign:"center",marginBottom:12},
  input:{width:"100%",background:"#221f38",border:"1px solid #2e2a4a",borderRadius:12,padding:"12px 14px",color:"#e8e0ff",fontFamily:"'Exo 2', sans-serif",fontSize:14,outline:"none",display:"block",marginBottom:12},
  label:{display:"block",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"#8b80b0",marginBottom:6},
  avatar:{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg, #3b2f6e, #5a4a9e)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:"#00e5c3",flexShrink:0},
  editBtn:{fontSize:11,padding:"4px 10px",borderRadius:8,background:"#221f38",border:"1px solid #2e2a4a",color:"#e8e0ff",cursor:"pointer",fontFamily:"'Exo 2', sans-serif",fontWeight:700},
  iconBtn:{background:"#221f38",border:"1px solid #2e2a4a",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:"#e8e0ff"},
  addTapperBtn:{padding:"4px 10px",borderRadius:20,background:"rgba(0,229,195,0.08)",border:"1px solid #00e5c3",color:"#00e5c3",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Exo 2', sans-serif"},
  chip:{padding:"8px 10px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",borderWidth:1,borderStyle:"solid",borderColor:"#2e2a4a",background:"#221f38",color:"#8b80b0",textTransform:"uppercase",textAlign:"center"},
  chipActive:{background:"rgba(0,229,195,0.1)",borderColor:"#00e5c3",color:"#00e5c3"},
  chipUnavailable:{background:"rgba(255,79,109,0.1)",borderColor:"#ff4f6d",color:"#ff4f6d"},
  btnPrimary:{width:"100%",padding:14,borderRadius:12,background:"linear-gradient(135deg, #00e5c3, #00b89c)",color:"#0f0d1a",fontFamily:"'Exo 2', sans-serif",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",textTransform:"uppercase",letterSpacing:1,display:"block",textAlign:"center",textDecoration:"none"},
  btnSecondary:{width:"100%",padding:"12px 14px",borderRadius:12,background:"#221f38",color:"#e8e0ff",fontFamily:"'Exo 2', sans-serif",fontSize:14,fontWeight:700,border:"1px solid #2e2a4a",cursor:"pointer",textTransform:"uppercase",letterSpacing:1,display:"block",textAlign:"center",textDecoration:"none"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  sheet:{background:"#1a1730",border:"1px solid #2e2a4a",borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:430},
  sheetHandle:{width:36,height:4,background:"#2e2a4a",borderRadius:2,margin:"0 auto 20px"},
  sheetTitle:{fontSize:18,fontWeight:700,color:"#f0eeff",marginBottom:16,fontFamily:"'Exo 2', sans-serif"},
};
