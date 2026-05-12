import { Resend } from "resend";
import { APP_CONFIG } from "@/lib/config";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  return new Resend(process.env.RESEND_API_KEY);
}
const FROM = process.env.RESEND_FROM_EMAIL || "ojcwalhalla@remigommans.nl";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Theme = "dark" | "light" | "amber";
const DEFAULT_THEME: Theme = (process.env.EMAIL_THEME as Theme) ?? "dark";

// ── Thema 1: Dark (standaard) ──────────────────────────────────────────────
const DARK_STYLES = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0f0d1a; color: #e8e0ff; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: #1a1730; border-radius: 16px; overflow: hidden; border: 1px solid #2e2a4a; }
  .header { background: linear-gradient(135deg, #1a1730, #221f38); padding: 32px; text-align: center; border-bottom: 1px solid #2e2a4a; }
  .logo { color: #00e5c3; font-size: 28px; font-weight: 900; letter-spacing: 3px; }
  .logo span { color: #f0eeff; }
  .subtitle { color: #8b80b0; font-size: 12px; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase; }
  .badge { display: inline-block; background: rgba(0,229,195,0.15); color: #00e5c3; border: 1px solid #00e5c3; border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px; }
  .content { padding: 32px; }
  h1 { color: #f0eeff; font-size: 22px; font-weight: 700; margin: 0 0 16px; }
  p { color: #8b80b0; line-height: 1.6; margin: 0 0 16px; font-size: 15px; }
  strong { color: #e8e0ff; }
  .highlight { background: rgba(0,229,195,0.08); border: 1px solid #00e5c3; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
  .highlight p { color: #e8e0ff; margin: 0; line-height: 1.8; }
  .meta { font-size: 13px; color: #8b80b0; margin-top: 8px; }
  .btn { display: inline-block; background: #00e5c3; color: #0f0d1a !important; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; margin: 12px 0 8px; }
  .warning { background: rgba(255,181,71,0.1); border: 1px solid #ffb547; border-radius: 10px; padding: 12px 16px; margin: 16px 0; }
  .warning p { color: #ffb547; margin: 0; font-size: 13px; }
  .footer { padding: 20px 32px; border-top: 1px solid #2e2a4a; text-align: center; }
  .footer p { color: #8b80b0; font-size: 12px; margin: 0; }
  .divider { border: none; border-top: 1px solid #2e2a4a; margin: 20px 0; }
`;

// ── Thema 2: Light Classic ─────────────────────────────────────────────────
const LIGHT_STYLES = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f0f5; color: #1a1a2e; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5ef; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: #1a1730; padding: 32px; text-align: center; }
  .logo { color: #00e5c3; font-size: 28px; font-weight: 900; letter-spacing: 3px; }
  .logo span { color: #f0eeff; }
  .subtitle { color: #8b80b0; font-size: 12px; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase; }
  .badge { display: inline-block; background: rgba(0,229,195,0.12); color: #00a88f; border: 1px solid #00c9b1; border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px; }
  .content { padding: 36px 32px; }
  h1 { color: #1a1a2e; font-size: 22px; font-weight: 700; margin: 0 0 16px; }
  p { color: #555577; line-height: 1.7; margin: 0 0 16px; font-size: 15px; }
  strong { color: #1a1a2e; }
  .highlight { background: #f0fdfb; border: 1px solid #00c9b1; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
  .highlight p { color: #1a1a2e; margin: 0; line-height: 1.8; }
  .meta { font-size: 13px; color: #888899; margin-top: 8px; }
  .btn { display: inline-block; background: #00c9b1; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; margin: 12px 0 8px; }
  .warning { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 10px; padding: 12px 16px; margin: 16px 0; }
  .warning p { color: #92400e; margin: 0; font-size: 13px; }
  .footer { padding: 20px 32px; border-top: 1px solid #e5e5ef; text-align: center; background: #fafafa; }
  .footer p { color: #999aaa; font-size: 12px; margin: 0; }
  .divider { border: none; border-top: 1px solid #e5e5ef; margin: 20px 0; }
`;

// ── Thema 3: Amber Craft ───────────────────────────────────────────────────
const AMBER_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; background: #f5ece0; color: #2c1a0e; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: #fffdf8; border-radius: 12px; overflow: hidden; border: 1px solid #e8d5b0; box-shadow: 0 4px 20px rgba(44,26,14,0.12); }
  .header { background: #2c1a0e; padding: 32px; text-align: center; }
  .logo { color: #d4820a; font-size: 28px; font-weight: 900; letter-spacing: 3px; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .logo span { color: #f5e6c8; }
  .subtitle { color: #a07850; font-size: 12px; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .badge { display: inline-block; background: rgba(212,130,10,0.15); color: #b06808; border: 1px solid #d4820a; border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .content { padding: 36px 32px; }
  h1 { color: #2c1a0e; font-size: 22px; font-weight: 700; margin: 0 0 16px; }
  p { color: #6b4423; line-height: 1.7; margin: 0 0 16px; font-size: 15px; }
  strong { color: #2c1a0e; }
  .highlight { background: #fef3e2; border: 1px solid #d4820a; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
  .highlight p { color: #2c1a0e; margin: 0; line-height: 1.8; }
  .meta { font-size: 13px; color: #8a6a40; margin-top: 8px; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .btn { display: inline-block; background: #d4820a; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; margin: 12px 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .warning { background: #fef3cd; border: 1px solid #c9950a; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
  .warning p { color: #7a5800; margin: 0; font-size: 13px; }
  .footer { padding: 20px 32px; border-top: 1px solid #e8d5b0; text-align: center; background: #fdf8f0; }
  .footer p { color: #a07850; font-size: 12px; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .divider { border: none; border-top: 1px solid #e8d5b0; margin: 20px 0; }
`;

// ── Template helper ────────────────────────────────────────────────────────
function emailTemplate(title: string, body: string, theme: Theme = DEFAULT_THEME) {
  const styles = theme === "light" ? LIGHT_STYLES : theme === "amber" ? AMBER_STYLES : DARK_STYLES;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">TAP<span>RSTR</span></div>
      <div class="subtitle">${APP_CONFIG.orgName} · ${APP_CONFIG.city}</div>
    </div>
    <div class="content">
      <h1>${title}</h1>
      ${body}
    </div>
    <div class="footer">
      <p>${APP_CONFIG.orgName} · ${APP_CONFIG.location}</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Rooster gepubliceerd ───────────────────────────────────────────────────
export async function sendRosterPublishedEmail(
  to: string,
  name: string,
  message?: string,
  period?: string
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "📅 Het taprooster is live!",
    html: emailTemplate(
      "Het rooster is gepubliceerd! 🍺",
      `
      ${period ? `<div class="badge">📅 ${period}</div>` : ""}
      <p>Hey ${name},</p>
      <p>Het nieuwe taprooster staat live. Bekijk jouw ingeplande diensten en bevestig je aanwezigheid.</p>
      ${message ? `<div class="highlight"><p>${message}</p></div>` : ""}
      <a href="${APP_URL}/rooster" class="btn">Bekijk rooster →</a>
      `
    ),
  });
}

// ── Reminder (2 weken of 1 week) ──────────────────────────────────────────
export async function sendShiftReminderEmail(
  to: string,
  name: string,
  shiftTitle: string,
  shiftDate: string,
  shiftTime: string,
  weeksAhead: 1 | 2
) {
  const days = weeksAhead === 2 ? 14 : 7;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `⏰ Reminder: jouw dienst over ${weeksAhead === 2 ? "2 weken" : "1 week"}`,
    html: emailTemplate(
      `Herinnering: nog ${days} dagen`,
      `
      <p>Hey ${name},</p>
      <p>Je staat ingepland — vergeet je dienst niet te bevestigen!</p>
      <div class="highlight">
        <p><strong>${shiftTitle}</strong></p>
        <p class="meta">📅 ${shiftDate}<br>🕐 ${shiftTime}<br>📍 ${APP_CONFIG.location}</p>
      </div>
      <a href="${APP_URL}/dashboard" class="btn">Bevestig aanwezigheid →</a>
      `
    ),
  });
}

// ── Open dienst notificatie ────────────────────────────────────────────────
export async function sendOpenShiftEmail(
  to: string,
  name: string,
  shiftTitle: string,
  shiftDate: string,
  shiftTime: string,
  shiftId: string
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `🔓 Open dienst: ${shiftDate}`,
    html: emailTemplate(
      "Er is een open plek! 🔓",
      `
      <p>Hey ${name},</p>
      <p>Er is zojuist een plek vrijgekomen. Wil jij tappen? Wees er snel bij — <strong>vol = vol!</strong></p>
      <div class="highlight">
        <p><strong>${shiftTitle}</strong></p>
        <p class="meta">📅 ${shiftDate}<br>🕐 ${shiftTime}<br>📍 ${APP_CONFIG.location}</p>
      </div>
      <a href="${APP_URL}/dashboard?claim=${shiftId}" class="btn">Claim deze dienst →</a>
      `
    ),
  });
}

// ── Uitnodigingslink ───────────────────────────────────────────────────────
export async function sendInviteEmail(to: string, token: string, adminName: string) {
  const inviteUrl = `${APP_URL}/register?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `🍺 Uitnodiging: Word tapper bij ${APP_CONFIG.orgName}`,
    html: emailTemplate(
      "Je bent uitgenodigd! 🍺",
      `
      <p>Hey,</p>
      <p><strong>${adminName}</strong> heeft je uitgenodigd om tapper te worden bij ${APP_CONFIG.orgName} in ${APP_CONFIG.city}.</p>
      <p>Klik op de knop hieronder om je account aan te maken.</p>
      <a href="${inviteUrl}" class="btn">Maak account aan →</a>
      <p class="meta" style="margin-top:16px;">⏳ Deze link is <strong>7 dagen</strong> geldig.<br>Daarna moet de admin een nieuwe uitnodiging versturen.</p>
      <hr class="divider">
      <p style="font-size:12px;">Link niet werken? Kopieer: ${inviteUrl}</p>
      `
    ),
  });
}

// ── Wachtwoord reset ───────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "🔑 Wachtwoord herstellen",
    html: emailTemplate(
      "Wachtwoord herstellen",
      `
      <p>Je hebt een wachtwoordherstel aangevraagd voor je Taprooster-account.</p>
      <a href="${resetLink}" class="btn">Herstel wachtwoord →</a>
      <p class="meta" style="margin-top:16px;">⏳ Deze link is <strong>24 uur</strong> geldig.</p>
      <div class="warning">
        <p>🔒 Heb je dit niet aangevraagd? Dan hoef je niets te doen — je wachtwoord is niet gewijzigd. Meld het wel bij de admin als je vermoedt dat iemand anders toegang probeerde te krijgen.</p>
      </div>
      `
    ),
  });
}

// ── Admin bericht ──────────────────────────────────────────────────────────
export async function sendAdminMessageEmail(to: string, name: string, title: string, body: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `📢 ${title}`,
    html: emailTemplate(
      `📢 ${title}`,
      `
      <p>Hey ${name},</p>
      <hr class="divider">
      <div class="highlight"><p>${body}</p></div>
      <a href="${APP_URL}/dashboard" class="btn">Bekijk in de app →</a>
      `
    ),
  });
}
