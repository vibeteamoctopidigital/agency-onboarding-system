import nodemailer, { type Transporter } from "nodemailer";
import { pino } from "pino";
import { env } from "../../utils/envConfig";

const logger = pino({ name: "email" });

/**
 * Transactional email via SMTP (Nodemailer). Works with SendGrid, SES,
 * Postmark, Gmail, or any SMTP host by filling the SMTP_* env vars.
 *
 * When SMTP is not configured the message is logged to the console instead of
 * sent, so every ticket flow still completes end-to-end in dev without creds.
 * Sends are best-effort: callers fire-and-forget and a delivery failure never
 * breaks the underlying ticket action.
 */

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (!env.isEmailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const FROM = () => env.EMAIL_FROM || env.SMTP_USER || "support@localhost";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sendMail(input: MailInput): Promise<void> {
  const tx = getTransporter();
  const text = input.text ?? htmlToText(input.html);

  if (!tx) {
    logger.info(
      { to: input.to, subject: input.subject },
      "[email:console] SMTP not configured - email logged, not sent",
    );
    logger.debug({ to: input.to, subject: input.subject, text }, "email body");
    return;
  }

  try {
    await tx.sendMail({ from: FROM(), to: input.to, subject: input.subject, html: input.html, text });
    logger.info({ to: input.to, subject: input.subject }, "email sent");
  } catch (error) {
    // Never let a mail failure bubble up into the ticket transaction.
    logger.error({ err: error, to: input.to, subject: input.subject }, "email send failed");
  }
}

// ---------------------------------------------------------------------------
// Templated wrappers - shared shell + specific bodies
// ---------------------------------------------------------------------------

function shell(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<p style="margin:28px 0 8px"><a href="${cta.url}" style="background:#111827;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">${cta.label}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <div style="padding:20px 28px;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:15px;color:#111827">Support Desk</div>
    <div style="padding:24px 28px">
      <h1 style="font-size:18px;margin:0 0 12px;color:#111827">${heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#374151">${bodyHtml}</div>
      ${button}
    </div>
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:11px;color:#9ca3af;text-align:center">This is an automated message from your agency's support desk.</p>
  </body></html>`;
}

function ticketUrl(): string {
  return `${env.appBaseUrl}/client/dashboard`;
}

export const emailService = {
  sendMail,

  /** Stage change notification to the client. */
  async ticketStageUpdate(opts: {
    to: string;
    displayId: number;
    subject: string;
    stageName: string;
    comment: string;
    agentName?: string;
  }) {
    const body = `
      <p>There's an update on your ticket <strong>#${opts.displayId} - ${escapeHtml(opts.subject)}</strong>.</p>
      <p style="margin:14px 0"><span style="display:inline-block;background:#eef2ff;color:#4338ca;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600">${escapeHtml(opts.stageName)}</span></p>
      <p style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:10px;padding:12px 14px;margin:0">${escapeHtml(opts.comment)}</p>
      ${opts.agentName ? `<p style="font-size:12px;color:#6b7280;margin-top:10px">- ${escapeHtml(opts.agentName)}</p>` : ""}`;
    return sendMail({
      to: opts.to,
      subject: `[#${opts.displayId}] ${opts.subject} - ${opts.stageName}`,
      html: shell("Your ticket was updated", body, { label: "View ticket", url: ticketUrl() }),
    });
  },

  /** New reply from the team to the client. */
  async ticketReply(opts: { to: string; displayId: number; subject: string; comment: string; agentName?: string }) {
    const body = `
      <p>You have a new reply on ticket <strong>#${opts.displayId} - ${escapeHtml(opts.subject)}</strong>:</p>
      <p style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:10px;padding:12px 14px;margin:12px 0">${escapeHtml(opts.comment)}</p>
      ${opts.agentName ? `<p style="font-size:12px;color:#6b7280;margin-top:10px">- ${escapeHtml(opts.agentName)}</p>` : ""}`;
    return sendMail({
      to: opts.to,
      subject: `[#${opts.displayId}] New reply - ${opts.subject}`,
      html: shell("New reply on your ticket", body, { label: "View & reply", url: ticketUrl() }),
    });
  },

  /** Ticket resolved / closed. */
  async ticketResolved(opts: { to: string; displayId: number; subject: string; comment: string }) {
    const body = `
      <p>Good news - your ticket <strong>#${opts.displayId} - ${escapeHtml(opts.subject)}</strong> has been resolved.</p>
      <p style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;padding:12px 14px;margin:12px 0">${escapeHtml(opts.comment)}</p>`;
    return sendMail({
      to: opts.to,
      subject: `[#${opts.displayId}] Resolved - ${opts.subject}`,
      html: shell("Your ticket was resolved", body, { label: "View ticket", url: ticketUrl() }),
    });
  },

  /** New team-member credentials (temporary password). */
  async teamMemberCredentials(opts: { to: string; name: string; email: string; tempPassword: string; agencyName: string }) {
    const body = `
      <p>Hi ${escapeHtml(opts.name)}, an account has been created for you on <strong>${escapeHtml(opts.agencyName)}</strong>'s support desk.</p>
      <div style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:10px;padding:14px 16px;margin:14px 0;font-family:ui-monospace,Menlo,monospace;font-size:13px">
        <div style="margin-bottom:6px"><span style="color:#6b7280">Email:</span> <strong>${escapeHtml(opts.email)}</strong></div>
        <div><span style="color:#6b7280">Temporary password:</span> <strong>${escapeHtml(opts.tempPassword)}</strong></div>
      </div>
      <p style="font-size:13px;color:#6b7280">For security, you'll be asked to set a new password the first time you sign in.</p>`;
    return sendMail({
      to: opts.to,
      subject: `Your ${opts.agencyName} support desk login`,
      html: shell("Welcome to the team", body, { label: "Sign in", url: `${env.appBaseUrl}/login` }),
    });
  },

  /** Ticket assigned to a team member. */
  async ticketAssigned(opts: { to: string; displayId: number; subject: string; priority: string }) {
    const body = `
      <p>A ticket has been assigned to you: <strong>#${opts.displayId} - ${escapeHtml(opts.subject)}</strong> (${escapeHtml(opts.priority)} priority).</p>`;
    return sendMail({
      to: opts.to,
      subject: `[#${opts.displayId}] Assigned to you - ${opts.subject}`,
      html: shell("New ticket assigned", body, { label: "Open ticket", url: `${env.appBaseUrl}/team/board` }),
    });
  },
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
