import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";

const paramsSchema = z.object({ type: z.enum(["package_issue", "package_usage"]), id: z.string().refine((value) => ObjectId.isValid(value), "invalid id") });
const bodySchema = z.object({ status: z.enum(["open", "resolved", "ignored"]), note: z.string().max(2000).optional().nullable() });

export async function PATCH(req: Request, ctx: { params: Promise<{ type: string; id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const parsedParams = paramsSchema.safeParse(await ctx.params);
  if (!parsedParams.success) return NextResponse.json({ message: "invalid reconciliation target" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ message: "invalid body" }, { status: 400 });

  const { type, id } = parsedParams.data;
  const { status } = parsedBody.data;
  const note = (parsedBody.data.note ?? "").trim();
  const _id = new ObjectId(id);
  const now = new Date();
  const reconciledAt = status === "open" ? null : now;
  const reconciledBy = status === "open" ? null : guard.admin._id;

  if (type === "package_issue") {
    const result = await guard.db.collection("packageOrders").updateOne(
      { _id },
      {
        $set: {
          "meta.reconcileStatus": status,
          "meta.reconcileNote": note,
          "meta.reconciledAt": reconciledAt,
          "meta.reconciledBy": reconciledBy,
          updatedAt: now,
        },
      },
    );
    if (result.matchedCount === 0) return NextResponse.json({ message: "package order not found" }, { status: 404 });
  } else {
    const result = await guard.db.collection("offline_service_records").updateOne(
      { _id },
      {
        $set: {
          "packageUsage.reconcileStatus": status,
          "packageUsage.reconcileNote": note,
          "packageUsage.reconciledAt": reconciledAt,
          "packageUsage.reconciledBy": reconciledBy,
          updatedAt: now,
          updatedBy: guard.admin._id,
        },
      },
    );
    if (result.matchedCount === 0) return NextResponse.json({ message: "offline record not found" }, { status: 404 });
  }

  await appendAudit(
    guard.db,
    {
      type: "offline_reconciliation_update",
      actorId: guard.admin._id,
      targetId: _id,
      message: "오프라인 보정 필요 항목 상태 변경",
      diff: { type, id, status, note },
    },
    req,
  );

  return NextResponse.json({ ok: true, item: { id, type, status, note, reconciledAt: reconciledAt ? reconciledAt.toISOString() : null, reconciledBy: reconciledBy ? String(reconciledBy) : null } });
}
