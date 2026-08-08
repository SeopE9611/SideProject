import nodemailer from "nodemailer";
import { getEffectiveSmtpConfig } from "@/lib/email/smtpConfig";

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  ics?: string; // iCalendar 문자열 (있으면 첨부)
  bcc?: string | string[];
};

export async function sendEmail({ to, subject, html, ics, bcc }: SendEmailArgs) {
  const smtp = await getEffectiveSmtpConfig();
  if (!smtp) throw new Error("SMTP is not configured");

  // ==안전밸브: 허용목록 외 수신자 차단 ==
  const SAFE_MODE = process.env.SAFE_MODE === "true";
  const allowSet = new Set(
    (process.env.SAFE_RCPT_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const guardRecipients = (rcpt: string | string[]) => {
    if (!SAFE_MODE) return rcpt;
    const list = Array.isArray(rcpt) ? rcpt : [rcpt];
    const filtered = list.filter((e) => allowSet.has(e.toLowerCase()));
    const fallback = process.env.SAFE_RCPT_FALLBACK || "dev@example.com";
    return filtered.length > 0 ? filtered : [fallback]; // 최소 보호용
  };

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: smtp.requireTLS,
    ignoreTLS: smtp.ignoreTLS,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  // ===ICS MIME 명시===
  const attachments = ics
    ? [
        {
          filename: "booking.ics",
          content: ics,
          contentType: "text/calendar; charset=UTF-8; method=REQUEST",
        },
      ]
    : undefined;

  await transporter.sendMail({
    from: smtp.from,
    to: guardRecipients(to),
    subject,
    html,
    bcc: bcc ? guardRecipients(bcc) : undefined,
    attachments,
    replyTo: smtp.replyTo,
  });
}
