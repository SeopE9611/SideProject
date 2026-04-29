import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { dispatchOutbox } from "@/app/features/notifications/core/dispatch";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

function maskRecipient(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    const [local, domain] = raw.split("@");
    const localMasked = local.length <= 2 ? `${local[0] ?? "*"}*` : `${local.slice(0, 2)}***`;
    return `${localMasked}@${domain ?? ""}`;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4) return `***${digits.slice(-4)}`;
  return "***";
}

function pickRecipient(rendered: any): string | null {
  return (
    maskRecipient(rendered?.email?.to) ??
    maskRecipient(rendered?.sms?.to) ??
    maskRecipient(rendered?.slack?.channel)
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // --- 관리자 인증 (공용 가드) ---
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db } = guard;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const _id = new ObjectId(id);
  const coll = db.collection("notifications_outbox");

  const doc = await coll.findOne(
    { _id },
    {
      projection: {
        status: 1,
        retries: 1,
        error: 1,
        templateKey: 1,
        template: 1,
        channels: 1,
        rendered: 1,
      },
    },
  );

  if (!doc) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  if (doc?.status !== "queued") {
    return NextResponse.json(
      {
        error: `status=${String(doc?.status)} 항목은 강제 발송할 수 없습니다.`,
      },
      { status: 400 },
    );
  }

  if (!doc?.rendered)
    return NextResponse.json(
      { error: "rendered payload가 없어 강제 발송할 수 없습니다." },
      { status: 400 },
    );

  // 강제 발송 = retries     즉시 dispatch 수행
  const before = {
    status: doc.status ?? null,
    retries: Number((doc as any).retries ?? 0),
    error: (doc as any).error ?? null,
  };
  await coll.updateOne(
    { _id },
    {
      $inc: { retries: 1 },
      $set: { error: null, lastTriedAt: new Date() },
    },
  );

  let auditResult: "success" | "failure" = "success";
  let dispatchErrorMessage: string | null = null;
  try {
    await dispatchOutbox(
      _id,
      doc.rendered,
      Array.isArray(doc.channels) ? doc.channels : [],
    );
  } catch (error: any) {
    auditResult = "failure";
    dispatchErrorMessage = String(error?.message ?? error ?? "dispatch failed");
    throw error;
  } finally {
    const afterDoc = await coll.findOne(
      { _id },
      { projection: { status: 1, retries: 1, error: 1 } },
    );
    await appendAdminAudit(
      db,
      {
        type: "notification.outbox.force",
        actorId: guard.admin._id,
        targetId: _id,
        message: "알림 아웃박스 강제 발송 실행",
        diff: {
          targetType: "notificationOutbox",
          actorEmail: guard.admin.email ?? null,
          actorName: guard.admin.name ?? null,
          actorRole: guard.admin.role ?? null,
          metadata: {
            actor: {
              id: String(guard.admin._id),
              email: guard.admin.email ?? null,
              name: guard.admin.name ?? null,
              role: guard.admin.role ?? "admin",
            },
          },
          before,
          after: {
            status: afterDoc?.status ?? null,
            retries: Number((afterDoc as any)?.retries ?? 0),
            error: (afterDoc as any)?.error ?? dispatchErrorMessage ?? null,
          },
          channel: Array.isArray(doc.channels) ? doc.channels : [],
          templateKey: (doc as any)?.templateKey ?? (doc as any)?.template?.key ?? null,
          recipient: pickRecipient((doc as any).rendered),
          result: auditResult,
        },
      },
      req,
    );
  }

  return NextResponse.json({ ok: true });
}
