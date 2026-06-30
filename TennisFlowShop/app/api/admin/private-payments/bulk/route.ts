import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { privatePayments } from "@/lib/private-payments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const body: { action?: unknown; ids?: unknown } = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(ObjectId.isValid) : [];
  if (!ids.length) return NextResponse.json({ ok: false, message: "선택된 항목이 없습니다." }, { status: 400 });
  const objectIds = ids.map((id) => new ObjectId(id));
  const col = privatePayments(guard.db);
  const now = new Date();

  if (action === "archive") {
    const result = await col.updateMany(
      { _id: { $in: objectIds }, paymentStatus: { $in: ["결제완료", "결제취소"] } },
      { $set: { archivedAt: now, archivedBy: guard.admin._id, updatedAt: now }, $push: { history: { status: "archive", date: now, description: "관리자 선택 보관" } } },
    );
    await appendAdminAudit(guard.db, { type: "private_payment.bulk_archive", actorId: guard.admin._id, message: "개인결제 선택 보관", diff: { ids, modifiedCount: result.modifiedCount } }, req);
    return NextResponse.json({ ok: true, modifiedCount: result.modifiedCount });
  }

  if (action === "unarchive") {
    const result = await col.updateMany(
      { _id: { $in: objectIds }, paymentStatus: { $in: ["결제완료", "결제취소"] } },
      { $set: { archivedAt: null, archivedBy: null, updatedAt: now }, $push: { history: { status: "unarchive", date: now, description: "관리자 선택 보관 해제" } } },
    );
    await appendAdminAudit(guard.db, { type: "private_payment.unarchive", actorId: guard.admin._id, message: "개인결제 선택 보관 해제", diff: { ids, modifiedCount: result.modifiedCount } }, req);
    return NextResponse.json({ ok: true, modifiedCount: result.modifiedCount });
  }

  if (action === "delete_pending") {
    const result = await col.deleteMany({ _id: { $in: objectIds }, paymentStatus: "결제대기" });
    await appendAdminAudit(guard.db, { type: "private_payment.bulk_delete_pending", actorId: guard.admin._id, message: "결제대기 개인결제 선택 삭제", diff: { ids, deletedCount: result.deletedCount } }, req);
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  }

  return NextResponse.json({ ok: false, message: "지원하지 않는 작업입니다." }, { status: 400 });
}
