import "server-only";

import type { Db } from "mongodb";
import { SETTINGS_COLLECTION, emailSettingsSchema } from "@/lib/admin-settings";
import { getDb } from "@/lib/mongodb";

const DOC_ID = "adminEmailSettings";

export type EffectiveSmtpConfig = {
  source: "database" | "environment";
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string | { name: string; address: string };
  replyTo?: string;
  secure: boolean;
  requireTLS?: boolean;
  ignoreTLS?: boolean;
};

export type SmtpSource = EffectiveSmtpConfig["source"] | "unconfigured";

export async function getEffectiveSmtpConfig(db?: Db): Promise<EffectiveSmtpConfig | null> {
  const database = db ?? (await getDb());
  const doc = await database
    .collection<{ _id: string; value?: unknown }>(SETTINGS_COLLECTION)
    .findOne({ _id: DOC_ID });
  const parsed = emailSettingsSchema.safeParse(doc?.value);

  if (parsed.success && parsed.data.smtpPassword?.trim()) {
    const settings = parsed.data;
    return {
      source: "database",
      host: settings.smtpHost,
      port: settings.smtpPort,
      user: settings.smtpUsername,
      pass: settings.smtpPassword!,
      from: { name: settings.senderName, address: settings.senderEmail },
      replyTo: settings.senderEmail,
      secure: settings.smtpEncryption === "ssl",
      requireTLS: settings.smtpEncryption === "tls" ? true : undefined,
      ignoreTLS: settings.smtpEncryption === "none" ? true : undefined,
    };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMPP_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) return null;

  return {
    source: "environment",
    host,
    port,
    user,
    pass,
    from:
      process.env.SMTP_FROM ||
      process.env.MAIL_FROM ||
      "도깨비테니스 <noreply@dokkaebitennis.com>",
    replyTo:
      process.env.SMTP_REPLY_TO ||
      process.env.SUPPORT_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.MAIL_FROM,
    secure: port === 465,
  };
}

export async function getSmtpSource(db?: Db): Promise<SmtpSource> {
  return (await getEffectiveSmtpConfig(db))?.source ?? "unconfigured";
}
