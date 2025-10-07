import nodemailer from 'nodemailer';

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  ics?: string; // iCalendar 문자열 (있으면 첨부)
  bcc?: string | string[];
};

export async function sendEmail({ to, subject, html, ics, bcc }: SendEmailArgs) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMPP_PORT || process.env.SMTP_PORT || 587); // 오타 대비 유지
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || 'no-reply@example.com';

  if (!host || !user || !pass) {
    throw new Error('SMTP env not set (SMTP_HOST/SMTP_USER/SMTP_PASS)');
  }

  // ==안전밸브: 허용목록 외 수신자 차단 ==
  const SAFE_MODE = process.env.SAFE_MODE === 'true';
  const allowSet = new Set(
    (process.env.SAFE_RCPT_ALLOWLIST ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  const guardRecipients = (rcpt: string | string[]) => {
    if (!SAFE_MODE) return rcpt;
    const list = Array.isArray(rcpt) ? rcpt : [rcpt];
    const filtered = list.filter((e) => allowSet.has(e.toLowerCase()));
    return filtered.length > 0 ? filtered : ['dev@dokkaebi.tennis']; // 최소 보호용
  };

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // ===ICS MIME 명시===
  const attachments = ics
    ? [
        {
          filename: 'booking.ics',
          content: ics,
          contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
        },
      ]
    : undefined;

  await transporter.sendMail({
    from,
    to: guardRecipients(to),
    subject,
    html,
    bcc: bcc ? guardRecipients(bcc) : undefined,
    attachments,
    replyTo: process.env.SUPPORT_EMAIL || process.env.MAIL_FROM,
  });
}
