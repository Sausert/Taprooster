"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MONTH_NL   = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const DAY_NL     = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
const DAY_SHORT  = ["Ma","Di","Wo","Do","Vr","Za","Zo"]; // Monday-first

type Assignment = { user_id: string; status: string };
type Shift = {
  id: string; title: string; date: string;
  start_time: string; end_time: string;
  max_tappers: number; type: string; role: string;
  assignments: Assignment[];
};
type View = "lijst" | "agenda";

// ── Helpers ──────────────────────────────────────────────────────────────────

function filled(shift: Shift) {
  return (shift.assignments || []).filter(a => a.status !== "declined").length;
}

function shiftColor(shift: Shift): string {
  if (shift.type === "feestje") return "#f472b6";
  const f = filled(shift);
  if (f >= shift.max_tappers) return "#00e5c3";
  if (f > 0)                  return "#ffb547";
  return "#ff4f6d";
}

function groupByMonth(shifts: Shift[]) {
  const map = new Map<string, { label: string; items: Shift[] }>();
  for (const s of shifts) {
    const [y, m] = s.date.split("-");
    const key = `${y}-${m}`;
    if (!map.has(key)) map.set(key, { label: `${MONTH_NL[+m - 1]} ${y}`, items: [] });
    map.get(key)!.items.push(s);
  }
  return [...map.entries()].map(([key, val]) => ({ key, ...val }));
}

function buildGrid(year: number, month: number): (number | null)[] {
  const first  = new Date(year, month, 1).getDay();        // 0=Sun
  const offset = first === 0 ? 6 : first - 1;              // Monday-first
  const days   = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function shiftsForDay(shifts: Shift[], year: number, month: number, day: number) {
  const key = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  return shifts.filter(s => s.date === key);
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { color: "#00e5c3", label: "Vol"      },
  { color: "#ffb547", label: "Niet vol" },
  { color: "#ff4f6d", label: "Leeg"     },
  { color: "#f472b6", label: "Feestje"  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function EmbedClient({ shifts }: { shifts: Shift[] }) {
  const router = useRouter();
  const today  = new Date();

  const [view,     setView]     = useState<View>("lijst");
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const minYear = today.getFullYear(); const minMonth = 0;
  const maxYear = today.getFullYear() + 1; const maxMonth = 11;

  const canPrev = !(calYear === minYear && calMonth === minMonth);
  const canNext = !(calYear === maxYear && calMonth === maxMonth);

  function prevMonth() {
    if (!canPrev) return;
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (!canNext) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [router]);

  const groups = groupByMonth(shifts);
  const cells  = buildGrid(calYear, calMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <div style={s.logo}>
            <span style={{ fontSize: 18 }}>🍺</span>
            <span style={s.logoText}>TAPROOSTER</span>
            <span style={s.orgName}>OJC Walhalla</span>
          </div>

          {/* View toggle */}
          <div style={s.toggle}>
            {(["lijst","agenda"] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  ...s.toggleBtn,
                  background:   view === v ? "#00e5c3"           : "transparent",
                  color:        view === v ? "#0f0d1a"           : "#b8b0d4",
                  fontWeight:   view === v ? 700                 : 500,
                  borderColor:  view === v ? "#00e5c3"           : "#2e2a4a",
                }}
              >
                {v === "lijst" ? "≡ Lijst" : "⊞ Agenda"}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={s.legend}>
          {LEGEND.map(({ color, label }) => (
            <div key={label} style={s.legendItem}>
              <span style={{ ...s.legendDot, background: color }} />
              <span style={s.legendLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={s.content}>
        {view === "lijst" ? (
          <ListView groups={groups} />
        ) : (
          <AgendaView
            shifts={shifts}
            calYear={calYear} calMonth={calMonth}
            cells={cells}
            canPrev={canPrev} canNext={canNext}
            onPrev={prevMonth} onNext={nextMonth}
            todayStr={todayStr}
          />
        )}
      </div>

      <p style={s.footer}>Automatisch bijgewerkt · remigommans.nl</p>
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ groups }: { groups: ReturnType<typeof groupByMonth> }) {
  if (groups.length === 0) return <p style={s.empty}>Geen geplande diensten gevonden.</p>;
  return (
    <>
      {groups.map(group => (
        <div key={group.key} style={{ marginBottom: 24 }}>
          <p style={s.monthLabel}>{group.label}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {group.items.map(shift => {
              const color = shiftColor(shift);
              const f     = filled(shift);
              const [y, m, d] = shift.date.split("-").map(Number);
              const day   = DAY_NL[new Date(y, m - 1, d).getDay()];
              const dateStr = `${day.charAt(0).toUpperCase() + day.slice(1)} ${d} ${MONTH_NL[m-1].slice(0,3).toLowerCase()}.`;

              return (
                <div key={shift.id} style={{ ...s.shiftRow, borderLeftColor: color }}>
                  <div style={s.shiftLeft}>
                    <span style={{ ...s.dot, background: color }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={s.shiftDate}>{dateStr}</p>
                      <p style={s.shiftTitle}>{shift.title}</p>
                    </div>
                  </div>
                  <div style={s.shiftRight}>
                    <span style={s.shiftTime}>{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)}</span>
                    <span style={{ ...s.badge, color, borderColor: color, background: `${color}18` }}>
                      {shift.type === "feestje" ? "Feestje" : `${f}/${shift.max_tappers}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Agenda view ───────────────────────────────────────────────────────────────

function AgendaView({
  shifts, calYear, calMonth, cells, canPrev, canNext, onPrev, onNext, todayStr,
}: {
  shifts: Shift[]; calYear: number; calMonth: number;
  cells: (number | null)[];
  canPrev: boolean; canNext: boolean;
  onPrev: () => void; onNext: () => void;
  todayStr: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  // Reset selection when month changes
  useEffect(() => { setSelected(null); }, [calYear, calMonth]);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const selectedShifts = selected
    ? shifts.filter(s => s.date === selected)
    : [];

  return (
    <>
      {/* Month navigation */}
      <div style={s.calNav}>
        <button onClick={onPrev} disabled={!canPrev} style={{ ...s.navBtn, opacity: canPrev ? 1 : 0.3 }}>‹</button>
        <span style={s.calMonthTitle}>{MONTH_NL[calMonth]} {calYear}</span>
        <button onClick={onNext} disabled={!canNext} style={{ ...s.navBtn, opacity: canNext ? 1 : 0.3 }}>›</button>
      </div>

      {/* Day headers */}
      <div style={s.calGrid}>
        {DAY_SHORT.map(d => (
          <div key={d} style={s.dayHeader}>{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} style={s.cellEmpty} />;

          const dateKey = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dayShifts = shiftsForDay(shifts, calYear, calMonth, day);
          const isToday   = dateKey === todayStr;
          const isSelected = dateKey === selected;
          const hasPast   = new Date(calYear, calMonth, day) < new Date(new Date().setHours(0,0,0,0));

          return (
            <div
              key={dateKey}
              onClick={() => dayShifts.length > 0 ? setSelected(isSelected ? null : dateKey) : undefined}
              style={{
                ...s.cell,
                background: isSelected ? "rgba(0,229,195,0.10)"
                          : isToday    ? "rgba(0,229,195,0.05)"
                          :              "#1a1730",
                border: isSelected ? "1px solid #00e5c3"
                      : isToday    ? "1px solid rgba(0,229,195,0.35)"
                      :              "1px solid #2e2a4a",
                cursor: dayShifts.length > 0 ? "pointer" : "default",
                opacity: hasPast && dayShifts.length === 0 ? 0.4 : 1,
              }}
            >
              <span style={{
                ...s.dayNum,
                color: isToday ? "#00e5c3" : hasPast ? "#6a6490" : "#e8e0ff",
                fontWeight: isToday ? 700 : 400,
              }}>
                {day}
              </span>

              {/* Shift pills — max 2, then +N */}
              <div style={{ display:"flex", flexDirection:"column", gap:2, marginTop:2 }}>
                {dayShifts.slice(0,2).map(shift => {
                  const c = shiftColor(shift);
                  return (
                    <div key={shift.id} style={{ ...s.calPill, background: `${c}22`, borderColor: c }}>
                      <span style={{ ...s.calPillDot, background: c }} />
                      <span style={{ ...s.calPillText, color: c }}>
                        {shift.title.length > 10 ? shift.title.slice(0,10) + "…" : shift.title}
                      </span>
                    </div>
                  );
                })}
                {dayShifts.length > 2 && (
                  <span style={{ fontSize: 9, color: "#b8b0d4", paddingLeft: 2 }}>
                    +{dayShifts.length - 2} meer
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selected && selectedShifts.length > 0 && (() => {
        const [y, m, d] = selected.split("-").map(Number);
        const dayName = DAY_NL[new Date(y, m-1, d).getDay()];
        const label   = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d} ${MONTH_NL[m-1]}`;
        return (
          <div style={s.detail}>
            <p style={s.detailTitle}>{label}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {selectedShifts.map(shift => {
                const color = shiftColor(shift);
                const f     = filled(shift);
                return (
                  <div key={shift.id} style={{ ...s.shiftRow, borderLeftColor: color }}>
                    <div style={s.shiftLeft}>
                      <span style={{ ...s.dot, background: color }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={s.shiftTitle}>{shift.title}</p>
                      </div>
                    </div>
                    <div style={s.shiftRight}>
                      <span style={s.shiftTime}>{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)}</span>
                      <span style={{ ...s.badge, color, borderColor: color, background: `${color}18` }}>
                        {shift.type === "feestje" ? "Feestje" : `${f}/${shift.max_tappers}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page:         { minHeight:"100vh", background:"#0f0d1a", fontFamily:"'Helvetica Neue',Arial,sans-serif", color:"#e8e0ff" },
  header:       { background:"rgba(26,23,48,0.98)", borderBottom:"1px solid #2e2a4a", padding:"14px 16px 10px", position:"sticky", top:0, zIndex:10 },
  headerTop:    { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  logo:         { display:"flex", alignItems:"center", gap:7 },
  logoText:     { fontWeight:900, fontSize:15, color:"#00e5c3", letterSpacing:"0.12em" },
  orgName:      { fontSize:11, color:"#6a6490", letterSpacing:"0.05em" },
  toggle:       { display:"flex", borderRadius:8, overflow:"hidden", border:"1px solid #2e2a4a" },
  toggleBtn:    { padding:"5px 12px", border:"none", borderLeft:"1px solid #2e2a4a", fontSize:11, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em", transition:"background 0.15s,color 0.15s" },
  legend:       { display:"flex", gap:12, flexWrap:"wrap" as const },
  legendItem:   { display:"flex", alignItems:"center", gap:5 },
  legendDot:    { width:7, height:7, borderRadius:"50%", flexShrink:0 },
  legendLabel:  { fontSize:10, color:"#b8b0d4" },
  content:      { padding:"14px 12px 40px", maxWidth:680, margin:"0 auto" },
  empty:        { textAlign:"center" as const, color:"#b8b0d4", fontSize:14, marginTop:40 },
  monthLabel:   { fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"#b8b0d4", marginBottom:7, paddingLeft:3 },
  shiftRow:     { display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, background:"#1a1730", border:"1px solid #2e2a4a", borderLeft:"4px solid", borderRadius:10, padding:"9px 12px" },
  shiftLeft:    { display:"flex", alignItems:"center", gap:9, minWidth:0, flex:1 },
  shiftRight:   { display:"flex", flexDirection:"column" as const, alignItems:"flex-end", gap:3, flexShrink:0 },
  dot:          { width:7, height:7, borderRadius:"50%", flexShrink:0 },
  shiftDate:    { fontSize:10, color:"#b8b0d4", marginBottom:1 },
  shiftTitle:   { fontSize:13, fontWeight:700, color:"#f0eeff", whiteSpace:"nowrap" as const, overflow:"hidden", textOverflow:"ellipsis", maxWidth:200 },
  shiftTime:    { fontFamily:"monospace", fontSize:11, color:"#b8b0d4" },
  badge:        { fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, border:"1px solid", letterSpacing:"0.04em" },
  // Calendar
  calNav:       { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  calMonthTitle:{ fontSize:14, fontWeight:700, color:"#f0eeff", letterSpacing:"0.04em" },
  navBtn:       { background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:8, color:"#e8e0ff", fontSize:18, width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 },
  calGrid:      { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 },
  dayHeader:    { textAlign:"center" as const, fontSize:10, fontWeight:700, color:"#6a6490", letterSpacing:"0.08em", paddingBottom:4 },
  cell:         { borderRadius:8, padding:"5px 4px 4px", minHeight:58 },
  cellEmpty:    { borderRadius:8, minHeight:58 },
  dayNum:       { fontSize:12, display:"block", textAlign:"center" as const, marginBottom:3 },
  calPill:      { display:"flex", alignItems:"center", gap:2, borderRadius:4, border:"1px solid", padding:"1px 3px", overflow:"hidden" },
  calPillDot:   { width:4, height:4, borderRadius:"50%", flexShrink:0 },
  calPillText:  { fontSize:9, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const },
  detail:       { marginTop:14, padding:"12px 14px", background:"#1a1730", border:"1px solid #2e2a4a", borderRadius:12 },
  detailTitle:  { fontSize:12, fontWeight:700, color:"#b8b0d4", letterSpacing:"0.06em", marginBottom:10 },
  footer:       { textAlign:"center" as const, fontSize:10, color:"#4a4470", padding:"0 0 16px", letterSpacing:"0.04em" },
};
