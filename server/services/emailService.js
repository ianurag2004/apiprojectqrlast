const nodemailer = require('nodemailer');

/**
 * FestOS Email Service
 * Gracefully degrades when SMTP credentials are not configured —
 * logs a warning instead of crashing the app.
 */

let transporter = null;

const initTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || SMTP_USER === 'your_email@gmail.com' || !SMTP_PASS || SMTP_PASS === 'your_app_password') {
    console.warn('⚠️  SMTP not configured — emails will be logged to console instead of sent.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(SMTP_PORT || '587', 10),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
};

/* ── Shared HTML wrapper ────────────────────────────────────────── */
const wrap = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#0D0F1A;color:#ffffff;">
  <div style="max-width:560px;margin:40px auto;background:#12102B;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 32px;">
      <table width="100%"><tr>
        <td><span style="font-size:22px;font-weight:700;color:#fff;">⚡ FestOS</span></td>
        <td align="right"><span style="font-size:11px;color:rgba(255,255,255,0.7);">Manav Rachna University</span></td>
      </tr></table>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      <h2 style="margin:0 0 20px;font-size:20px;color:#fff;">${title}</h2>
      ${body}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <span style="font-size:11px;color:rgba(255,255,255,0.3);">
        © ${new Date().getFullYear()} FestOS · Manav Rachna University · Powered by AI
      </span>
    </div>
  </div>
</body>
</html>`;

/* ── Email senders ──────────────────────────────────────────────── */

/**
 * Send registration confirmation email.
 */
exports.sendRegistrationEmail = async ({ to, participantName, eventTitle, eventDate, venue, qrDataUrl }) => {
  const dateStr = new Date(eventDate).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const body = `
    <p style="color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${participantName}</strong>,<br>
      You've been successfully registered! Here are your details:
    </p>
    <table width="100%" style="border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.08);border-radius:8px 0 0 0;color:rgba(255,255,255,0.5);font-size:12px;">Event</td>
          <td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.08);color:#fff;font-weight:600;">${eventTitle}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:12px;">Date</td>
          <td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.08);color:#fff;">${dateStr}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:12px;">Venue</td>
          <td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.08);color:#fff;">${venue}</td></tr>
    </table>
    ${qrDataUrl ? `
    <div style="text-align:center;margin-bottom:20px;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:12px;">Your Check-in QR Code</p>
      <div style="display:inline-block;padding:4px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#10b981);">
        <div style="background:#fff;padding:8px;border-radius:10px;">
          <img src="${qrDataUrl}" alt="QR Code" width="180" height="180" style="display:block;" />
        </div>
      </div>
    </div>` : ''}
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">
      Show this QR code at the venue for quick check-in. See you there! 🎉
    </p>`;

  return sendMail({
    to,
    subject: `✅ Registration Confirmed — ${eventTitle}`,
    html: wrap('Registration Confirmed 🎉', body),
  });
};

/**
 * Send check-in confirmation email.
 */
exports.sendCheckInEmail = async ({ to, participantName, eventTitle }) => {
  const body = `
    <p style="color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${participantName}</strong>,<br>
      You've been successfully checked in to <strong style="color:#a78bfa;">${eventTitle}</strong>.
    </p>
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
      <span style="font-size:32px;">✅</span>
      <p style="color:#10b981;font-weight:600;margin:8px 0 0;font-size:15px;">Check-in Successful</p>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:4px 0 0;">${new Date().toLocaleString('en-IN')}</p>
    </div>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">
      Enjoy the event! Your participation certificate will be available once the event concludes.
    </p>`;

  return sendMail({
    to,
    subject: `✅ Checked In — ${eventTitle}`,
    html: wrap('Check-in Confirmed ✅', body),
  });
};

/**
 * Send event approval/rejection notification to organizer.
 */
exports.sendApprovalEmail = async ({ to, organizerName, eventTitle, status, comment }) => {
  const isApproved = status === 'approved';
  const emoji = isApproved ? '🎉' : '❌';
  const color = isApproved ? '#10b981' : '#ef4444';
  const label = isApproved ? 'Approved' : 'Rejected';

  const body = `
    <p style="color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${organizerName}</strong>,<br>
      Your event proposal has been <strong style="color:${color};">${label.toLowerCase()}</strong>.
    </p>
    <div style="background:rgba(${isApproved ? '16,185,129' : '239,68,68'},0.1);border:1px solid rgba(${isApproved ? '16,185,129' : '239,68,68'},0.3);border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
      <span style="font-size:32px;">${emoji}</span>
      <p style="color:${color};font-weight:600;margin:8px 0 0;font-size:15px;">${eventTitle}</p>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:4px 0 0;">Status: ${label}</p>
    </div>
    ${comment ? `
    <div style="background:rgba(255,255,255,0.05);border-left:3px solid ${color};padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;">Comment</p>
      <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">${comment}</p>
    </div>` : ''}`;

  return sendMail({
    to,
    subject: `${emoji} Event ${label} — ${eventTitle}`,
    html: wrap(`Event ${label} ${emoji}`, body),
  });
};

/* ── Internal send helper ────────────────────────────────────── */
async function sendMail({ to, subject, html }) {
  const t = initTransporter();

  if (!t) {
    // Graceful fallback — log instead of sending
    console.log(`📧 [EMAIL PREVIEW] To: ${to} | Subject: ${subject}`);
    return { preview: true, to, subject };
  }

  try {
    const info = await t.sendMail({
      from: `"FestOS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`📧 Email failed to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}
