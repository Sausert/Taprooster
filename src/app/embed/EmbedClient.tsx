"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MONTH_NL = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const DAY_NL   = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];

type Assignment = { user_id: string; status: string };
type Shift = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  max_tappers: number;
  type: string;
  role: string;
  assignments: Assignment[];
};

function shiftColor(shift: Shift): string {
  if (shift.type === "feestje") return "#f472b6";
  const filled = (shift.assignments || []).filter(a => a.status !== "declined").length;
  if (filled >= shift.max_tappers) return "#00e5c3";
  if (filled > 0)                  return "#ffb547";
  return "#ff4f6d";
}

function shiftLabel(shift: Shift): string {
  if (shift.type === "feestje") return "Feestje";
  const filled = (shift.assignments || []).filter(a => a.status !== "declined").length;
  if (filled >= shift.max_tappers) return "Vol";
  if (filled > 0)                  return "Niet vol";
  return "Leeg";
}

function groupByMonth(shifts: Shift[]): { key: string; label: string; items: Shift[] }[] {
  const map = new Map<string, { label: string; items: Shift[] }>();
  for (const s of shifts) {
    const [y, m] = s.date.split("-");
    const key = `${y}-${m}`;
    if (!map.has(key)) map.set(key, { label: `${MONTH_NL[parseInt(m) - 1]} ${y}`, items: [] });
    map.get(key)!.items.push(s);
  }
  return [...map.entries()].map(([key, val]) => ({ key, ...val }));
}

export default function EmbedClient({ shifts }: { shifts: Shift[] }) {
  const router = useRouter();

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [router]);

  const groups = groupByMonth(shifts);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={{ fontSize: 18 }}>🍺</span>
            <span style={s.logoText}>TAPROOSTER</span>
          </div>
          <span style={s.orgName}>OJC Walhalla</span>
        </div>

        {/* Legenda */}
        <div style={s.legend}>
          {[
            { color: "#00e5c3", label: "Vol" },
            { color: "#ffb547", label: "Niet vol" },
            { color: "#ff4f6d", label: "Leeg" },
            { color: "#f472b6", label: "Feestje" },
          ].map(({ color, label }) => (
            <div key={label} style={s.legendItem}>
              <span style={{ ...s.legendDot, background: color }} />
              <span style={s.legendLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={s.content}>
        {groups.length === 0 ? (
          <p style={s.empty}>Geen geplande diensten gevonden.</p>
        ) : (
          groups.map(group => (
            <div key={group.key} style={s.monthSection}>
              <p style={s.monthLabel}>{group.label}</p>
              <div style={s.shiftList}>
                {group.items.map(shift => {
                  const color  = shiftColor(shift);
                  const label  = shiftLabel(shift);
                  const filled = (shift.assignments || []).filter(a => a.status !== "declined").length;
                  const [y, m, d] = shift.date.split("-").map(Number);
                  const dayName   = DAY_NL[new Date(y, m - 1, d).getDay()];
                  const dateStr   = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d} ${MONTH_NL[m - 1].slice(0, 3).toLowerCase()}.`;

                  return (
                    <div key={shift.id} style={{ ...s.shiftRow, borderLeftColor: color }}>
                      <div style={s.shiftLeft}>
                        <span style={{ ...s.statusDot, background: color }} />
                        <div>
                          <p style={s.shiftDate}>{dateStr}</p>
                          <p style={s.shiftTitle}>{shift.title}</p>
                        </div>
                      </div>
                      <div style={s.shiftRight}>
                        <span style={s.shiftTime}>
                          {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                        </span>
                        <span style={{ ...s.spotBadge, color, borderColor: color, background: `${color}18` }}>
                          {shift.type === "feestje" ? label : `${filled}/${shift.max_tappers}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <p style={s.footer}>Automatisch bijgewerkt · remigommans.nl</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f0d1a",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    color: "#e8e0ff",
  },
  header: {
    background: "rgba(26,23,48,0.98)",
    borderBottom: "1px solid #2e2a4a",
    padding: "16px 20px 12px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontWeight: 900,
    fontSize: 16,
    color: "#00e5c3",
    letterSpacing: "0.12em",
  },
  orgName: {
    fontSize: 12,
    color: "#b8b0d4",
    letterSpacing: "0.05em",
  },
  legend: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap" as const,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: 11,
    color: "#b8b0d4",
    letterSpacing: "0.04em",
  },
  content: {
    padding: "16px 16px 40px",
    maxWidth: 640,
    margin: "0 auto",
  },
  empty: {
    textAlign: "center",
    color: "#b8b0d4",
    fontSize: 14,
    marginTop: 40,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#b8b0d4",
    marginBottom: 8,
    paddingLeft: 4,
  },
  shiftList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  shiftRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "#1a1730",
    border: "1px solid #2e2a4a",
    borderLeft: "4px solid",
    borderRadius: 10,
    padding: "10px 14px",
  },
  shiftLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  shiftDate: {
    fontSize: 11,
    color: "#b8b0d4",
    marginBottom: 2,
    letterSpacing: "0.02em",
  },
  shiftTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#f0eeff",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 220,
  },
  shiftRight: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  shiftTime: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#b8b0d4",
    letterSpacing: "0.02em",
  },
  spotBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
    border: "1px solid",
    letterSpacing: "0.04em",
  },
  footer: {
    textAlign: "center" as const,
    fontSize: 11,
    color: "#4a4470",
    padding: "0 0 20px",
    letterSpacing: "0.04em",
  },
};
