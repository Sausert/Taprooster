// ============================================================
// lib/email.ts — E-mail verzending via Resend
// ============================================================
import { Resend } from "resend";
import { APP_CONFIG } from "@/lib/config";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  return new Resend(process.env.RESEND_API_KEY);
}
const FROM = process.env.RESEND_FROM_EMAIL || "taprooster@ojcwalhalla.nl";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ── Template helper ──
function emailTemplate(title: string, body: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0f0d1a; color: #e8e0ff; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #1a1730; border-radius: 16px; overflow: hidden; border: 1px solid #2e2a4a; }
    .header { background: linear-gradient(135deg, #1a1730, #221f38); padding: 32px; text-align: center; border-bottom: 1px solid #2e2a4a; }
    .logo { color: #00e5c3; font-size: 28px; font-weight: 900; letter-spacing: 3px; }
    .logo span { color: #f0eeff; }
    .subtitle { color: #8b80b0; font-size: 12px; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase; }
    .content { padding: 32px; }
    h1 { color: #f0eeff; font-size: 22px; font-weight: 700; margin: 0 0 16px; }
    p { color: #8b80b0; line-height: 1.6; margin: 0 0 16px; font-size: 15px; }
    .highlight { background: rgba(0,229,195,0.08); border: 1px solid #00e5c3; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .highlight p { color: #e8e0ff; margin: 0; }
    .btn { display: inline-block; background: #00e5c3; color: #0f0d1a; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; margin: 8px 0; }
    .footer { padding: 20px 32px; border-top: 1px solid #2e2a4a; text-align: center; }
    .footer p { color: #8b80b0; font-size: 12px; margin: 0; }
  </style>
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

// ── Rooster gepubliceerd ──
export async function sendRosterPublishedEmail(
  to: string,
  name: string,
  message?: string
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "📅 Het taprooster is live!",
    html: emailTemplate(
      "Het rooster is gepubliceerd! 🍺",
      `
      <p>Hey ${name},</p>
      <p>Het nieuwe taprooster staat live. Bekijk jouw ingeplande diensten in de app.</p>
      ${message ? `<div class="highlight"><p>${message}</p></div>` : ""}
      <a href="${APP_URL}/rooster" class="btn">Bekijk rooster →</a>
      `
    ),
  });
}

// ── Reminder (2 weken of 1 week) ──
export async function sendShiftReminderEmail(
  to: string,
  name: string,
  shiftTitle: string,
  shiftDate: string,
  shiftTime: string,
  weeksAhead: 1 | 2
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `⏰ Reminder: jouw dienst over ${weeksAhead === 2 ? "2 weken" : "1 week"}`,
    html: emailTemplate(
      `Herinnering: dienst over ${weeksAhead === 2 ? "2 weken" : "1 week"}`,
      `
      <p>Hey ${name},</p>
      <p>Vergeet je dienst niet!</p>
      <div class="highlight">
        <p><strong>${shiftTitle}</strong><br>
        📅 ${shiftDate}<br>
        🕐 ${shiftTime}</p>
      </div>
      <a href="${APP_URL}/dashboard" class="btn">Bevestig aanwezigheid →</a>
      `
    ),
  });
}

// ── Open dienst notificatie ──
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
      "Er is een open plek!",
      `
      <p>Hey ${name},</p>
      <p>Er is een open plek vrijgekomen. Wil jij tappen?</p>
      <div class="highlight">
        <p><strong>${shiftTitle}</strong><br>
        📅 ${shiftDate}<br>
        🕐 ${shiftTime}</p>
      </div>
      <a href="${APP_URL}/dashboard?claim=${shiftId}" class="btn">Claim deze dienst →</a>
      `
    ),
  });
}

// ── Uitnodigingslink ──
export async function sendInviteEmail(to: string, token: string, adminName: string) {
  const inviteUrl = `${APP_URL}/register?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `🍺 Uitnodiging: Word tapper bij ${APP_CONFIG.orgName}`,
    html: emailTemplate(
      "Je bent uitgenodigd!",
      `
      <p>Hey,</p>
      <p><strong>${adminName}</strong> heeft je uitgenodigd om tapper te worden bij ${APP_CONFIG.orgName}.</p>
      <p>Klik op de knop hieronder om je account aan te maken. Deze link is 7 dagen geldig.</p>
      <a href="${inviteUrl}" class="btn">Maak account aan →</a>
      <p style="font-size:12px; margin-top:16px;">Of kopieer: ${inviteUrl}</p>
      `
    ),
  });
}

// ── Wachtwoord reset ──
export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "🔑 Wachtwoord herstellen",
    html: emailTemplate(
      "Wachtwoord herstellen",
      `
      <p>Je hebt een wachtwoordherstel aangevraagd.</p>
      <a href="${resetLink}" class="btn">Herstel wachtwoord →</a>
      <p style="font-size:12px;">Heb je dit niet aangevraagd? Negeer dan deze mail.</p>
      `
    ),
  });
}
