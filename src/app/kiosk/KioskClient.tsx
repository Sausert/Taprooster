"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { parseLocalDate, formatDate } from "@/lib/dates";

const MONTH_NAMES = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const DAY_SHORT = ["zo","ma","di","wo","do","vr","za"];
const DAY_FULL = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];

type Assignment = { user_id: string; status: string; profile?: { id: string; full_name: string | null } | null };
type Shift = {
  id: string; date: string; title: string; start_time: string; end_time: string;
  max_tappers: number; type: string; assignments: Assignment[];
};

function fmtTime(t: string) { return t?.slice(0, 5) ?? ""; }
function fmtDateFull(dateStr: string) {
  const d = parseLocalDate(dateStr);
  return `${DAY_FULL[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function fmtDateShort(dateStr: string) {
  const d = parseLocalDate(dateStr);
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase()}`;
}
function tappers(shift: Shift) {
  return shift.assignments.filter(a => a.status !== "declined");
}
function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}
function isTomorrow(dateStr: string) {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return dateStr === t.toISOString().split("T")[0];
}

export default function KioskClient({ shifts: initialShifts, accessKey }: { shifts: Shift[]; accessKey: string }) {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-reload every 5 minutes
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [router]);

  // Supabase real-time
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kiosk-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_assignments" }, (payload) => {
        setShifts(prev => prev.map(s => {
          if (payload.eventType === "INSERT" && s.id === payload.new.shift_id) {
            const exists = s.assignments.some(a => a.user_id === payload.new.user_id);
            if (exists) return s;
            return { ...s, assignments: [...s.assignments, payload.new as Assignment] };
          }
          if (payload.eventType === "UPDATE" && s.id === payload.new.shift_id) {
            return { ...s, assignments: s.assignments.map(a => a.user_id === payload.new.user_id ? { ...a, status: payload.new.status } : a) };
          }
          if (payload.eventType === "DELETE" && s.id === payload.old.shift_id) {
            return { ...s, assignments: s.assignments.filter(a => a.user_id !== payload.old.user_id) };
          }
          return s;
        }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const todayStr = now.toISOString().split("T")[0];
  const todayShift = shifts.find(s => s.date === todayStr);
  const tomorrowShift = shifts.find(s => isTomorrow(s.date));
  const upcoming = shifts.filter(s => s.date > todayStr);

  // Group upcoming by month
  const byMonth: Record<string, Shift[]> = {};
  upcoming.forEach(s => {
    const key = s.date.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(s);
  });

  const timeStr = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLogo}>🍺 <span style={{ color: "#00e5c3" }}>TAP</span><span style={{ color: "#f0eeff" }}>ROOSTER</span></div>
        <div style={s.headerDate}>{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</div>
        <div style={s.headerClock}>{timeStr}</div>
      </div>

      {/* Body */}
      <div style={s.body}>
        {/* Left panel — vanavond */}
        <div style={s.leftPanel}>
          <TonightCard shift={todayShift} />
          {tomorrowShift && <NextCard shift={tomorrowShift} label="Morgen" />}
          {!tomorrowShift && upcoming[0] && <NextCard shift={upcoming[0]} label="Volgende dienst" />}
        </div>

        {/* Right panel — komende diensten */}
        <div style={s.rightPanel}>
          <div style={s.rightTitle}>KOMENDE DIENSTEN</div>
          <div style={s.shiftList}>
            {Object.entries(byMonth).map(([monthKey, monthShifts]) => {
              const [y, m] = monthKey.split("-").map(Number);
              return (
                <div key={monthKey}>
                  <div style={s.monthHeader}>{MONTH_NAMES[m - 1]} {y}</div>
                  {monthShifts.map(shift => (
                    <ShiftRow key={shift.id} shift={shift} />
                  ))}
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <div style={s.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ color: "#8b80b0", fontSize: 16 }}>Geen komende diensten gepland</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TonightCard({ shift }: { shift: Shift | undefined }) {
  if (!shift) {
    return (
      <div style={s.tonightCard}>
        <div style={s.tonightLabel}>VANAVOND</div>
        <div style={s.tonightEmpty}>Geen dienst</div>
        <div style={{ color: "#4a4468", fontSize: 14, marginTop: 8 }}>Vrije avond 🎉</div>
      </div>
    );
  }
  const names = tappers(shift);
  const filled = names.length;
  const spots = shift.max_tappers;
  const statusColor = filled >= spots ? "#00e5c3" : filled === 0 ? "#ff4f6d" : "#ffb547";

  return (
    <div style={{ ...s.tonightCard, borderColor: statusColor, boxShadow: `0 0 32px ${statusColor}22` }}>
      <div style={{ ...s.tonightLabel, color: statusColor }}>VANAVOND</div>
      <div style={s.tonightTitle}>{shift.title}</div>
      <div style={s.tonightTime}>{fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}</div>
      <div style={s.tonightNames}>
        {names.length > 0 ? names.map(a => (
          <div key={a.user_id} style={s.tonightName}>
            {(a.profile?.full_name ?? "?").split(" ")[0]}
          </div>
        )) : (
          <div style={{ color: "#ff4f6d", fontSize: 15 }}>Nog niemand ingeschreven</div>
        )}
      </div>
      <div style={{ ...s.tonightOccupancy, color: statusColor }}>
        {filled}/{spots} bezet
      </div>
    </div>
  );
}

function NextCard({ shift, label }: { shift: Shift; label: string }) {
  const names = tappers(shift);
  return (
    <div style={s.nextCard}>
      <div style={s.nextLabel}>{label.toUpperCase()}</div>
      <div style={s.nextDate}>{fmtDateFull(shift.date)}</div>
      <div style={s.nextTime}>{fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}</div>
      <div style={s.nextNames}>
        {names.length > 0
          ? names.map(a => (a.profile?.full_name ?? "?").split(" ")[0]).join(" · ")
          : "Nog geen tappers"}
      </div>
    </div>
  );
}

function ShiftRow({ shift }: { shift: Shift }) {
  const names = tappers(shift);
  const filled = names.length;
  const spots = shift.max_tappers;
  const isParty = shift.type === "feestje";
  const statusColor = isParty ? "#f472b6" : filled >= spots ? "#00e5c3" : filled === 0 ? "#ff4f6d" : "#ffb547";
  const date = parseLocalDate(shift.date);

  return (
    <div style={{ ...s.shiftRow, borderLeftColor: statusColor }}>
      <div style={s.shiftRowDate}>
        <div style={s.shiftRowDay}>{DAY_SHORT[date.getDay()]}</div>
        <div style={s.shiftRowNum}>{date.getDate()}</div>
      </div>
      <div style={s.shiftRowInfo}>
        <div style={s.shiftRowTitle}>
          {shift.title}
          {isParty && <span style={s.partyBadge}>feestje</span>}
        </div>
        <div style={s.shiftRowTime}>{fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}</div>
      </div>
      <div style={s.shiftRowTappers}>
        {names.length > 0
          ? names.map(a => (
            <span key={a.user_id} style={s.tapperPill}>
              {(a.profile?.full_name ?? "?").split(" ")[0]}
            </span>
          ))
          : <span style={{ color: "#ff4f6d", fontSize: 13 }}>Leeg</span>
        }
      </div>
      <div style={{ ...s.shiftRowCount, color: statusColor }}>
        {filled}/{spots}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    maxHeight: "100vh",
    background: "#0f0d1a",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    overflow: "hidden",
    color: "#e8e0ff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 28px",
    background: "#1a1730",
    borderBottom: "1px solid #2e2a4a",
    flexShrink: 0,
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 3,
  },
  headerDate: {
    fontSize: 16,
    color: "#a89ec8",
    fontWeight: 500,
  },
  headerClock: {
    fontSize: 28,
    fontWeight: 700,
    color: "#00e5c3",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: 2,
    minWidth: 110,
    textAlign: "right",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },

  // Left panel
  leftPanel: {
    width: 300,
    minWidth: 300,
    flexShrink: 0,
    borderRight: "1px solid #2e2a4a",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto",
  },
  tonightCard: {
    background: "#1a1730",
    border: "2px solid #2e2a4a",
    borderRadius: 16,
    padding: "20px 18px",
    transition: "border-color 0.4s, box-shadow 0.4s",
  },
  tonightLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 3,
    color: "#00e5c3",
    marginBottom: 10,
  },
  tonightEmpty: {
    fontSize: 24,
    fontWeight: 700,
    color: "#3e3a5a",
  },
  tonightTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f0eeff",
    marginBottom: 4,
  },
  tonightTime: {
    fontSize: 14,
    color: "#8b80b0",
    marginBottom: 16,
  },
  tonightNames: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 14,
  },
  tonightName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#c4b5fd",
    letterSpacing: 0.5,
  },
  tonightOccupancy: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
  },
  nextCard: {
    background: "#221f38",
    border: "1px solid #2e2a4a",
    borderRadius: 12,
    padding: "14px 16px",
  },
  nextLabel: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 2,
    color: "#5a5480",
    marginBottom: 6,
  },
  nextDate: {
    fontSize: 15,
    fontWeight: 700,
    color: "#e8e0ff",
    marginBottom: 2,
  },
  nextTime: {
    fontSize: 13,
    color: "#8b80b0",
    marginBottom: 8,
  },
  nextNames: {
    fontSize: 14,
    color: "#c4b5fd",
    fontWeight: 600,
  },

  // Right panel
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "24px 28px 0",
  },
  rightTitle: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 3,
    color: "#5a5480",
    marginBottom: 16,
    flexShrink: 0,
  },
  shiftList: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: 24,
    paddingRight: 4,
  },
  monthHeader: {
    fontSize: 13,
    fontWeight: 700,
    color: "#8b80b0",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 20,
    paddingBottom: 6,
    borderBottom: "1px solid #2e2a4a",
  },
  shiftRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#1a1730",
    borderLeft: "4px solid #00e5c3",
    borderRadius: "0 10px 10px 0",
    marginBottom: 8,
    padding: "12px 16px",
  },
  shiftRowDate: {
    width: 40,
    textAlign: "center",
    flexShrink: 0,
  },
  shiftRowDay: {
    fontSize: 11,
    color: "#8b80b0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  shiftRowNum: {
    fontSize: 22,
    fontWeight: 700,
    color: "#f0eeff",
    lineHeight: 1.1,
  },
  shiftRowInfo: {
    minWidth: 160,
    flexShrink: 0,
  },
  shiftRowTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#f0eeff",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  shiftRowTime: {
    fontSize: 13,
    color: "#8b80b0",
    marginTop: 2,
  },
  shiftRowTappers: {
    flex: 1,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  tapperPill: {
    background: "rgba(196,181,253,0.12)",
    border: "1px solid rgba(196,181,253,0.3)",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 13,
    color: "#c4b5fd",
    fontWeight: 600,
  },
  shiftRowCount: {
    fontSize: 14,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    minWidth: 32,
    textAlign: "right",
  },
  partyBadge: {
    background: "rgba(244,114,182,0.15)",
    color: "#f472b6",
    border: "1px solid rgba(244,114,182,0.4)",
    borderRadius: 20,
    padding: "1px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 0",
  },
};
