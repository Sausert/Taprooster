import { APP_CONFIG } from "@/lib/config";

interface AgendaShift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
}

// Apple devices in Safari open .ics directly in Apple Calendar; everywhere else
// (Chrome desktop + Android, Edge, Firefox) a Google Calendar link is far more
// reliable than a downloaded .ics file.
function preferIcs(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  return isApple && isSafari;
}

function googleCalendarUrl(shift: AgendaShift): string {
  const parseLocal = (d: string) => { const [y, m, day] = d.split("-").map(Number); return new Date(y, m - 1, day); };
  const [sh, sm] = shift.start_time.split(":").map(Number);
  const [eh, em] = shift.end_time.split(":").map(Number);
  const start = parseLocal(shift.date);
  start.setHours(sh, sm);
  const end = parseLocal(shift.date);
  end.setHours(eh, em);
  // Shifts ending past midnight roll over to the next day
  if (end <= start) end.setDate(end.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `🍺 ${shift.title}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Tapavond ${APP_CONFIG.orgName}`,
    location: APP_CONFIG.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function getAgendaLink(shift: AgendaShift): { url: string; type: "ical" | "google" } {
  if (preferIcs()) return { url: `/api/shifts/${shift.id}/ical`, type: "ical" };
  return { url: googleCalendarUrl(shift), type: "google" };
}

// Triggers the agenda action: opens Google Calendar in a new tab, or downloads
// the .ics. Use from an onClick handler within a user gesture.
export function openAgenda(shift: AgendaShift): void {
  const { url, type } = getAgendaLink(shift);
  if (type === "google") {
    window.open(url, "_blank", "noopener");
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
