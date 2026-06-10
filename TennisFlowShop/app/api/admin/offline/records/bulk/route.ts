import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";

function toObjectIds(ids: unknown[]): ObjectId[] {
  const uniqueIds = Array.from(
    new Set(
      ids
        .filter((id): id is string => typeof id === "string")
        .filter((id) => ObjectId.isValid(id)),
    ),
  );

  return uniqueIds.map((id) => new ObjectId(id));
}

function hasActiveLinkedAccounting(record: any): boolean {
  const points = record?.points ?? {};
  const packageUsage = record?.packageUsage ?? {};

  const hasActivePointGrant = Boolean(
    points.grantTxId &&
      !points.grantRevertTxId &&
      !points.grantRevertedAt,
  );

  const hasActivePointDeduct = Boolean(
    points.deductTxId &&
      !points.deductRevertTxId &&
      !points.deductRevertedAt,
  );

  const hasActivePackageUsage = Boolean(
    packageUsage.consumptionId &&
      !packageUsage.reverted &&
      !packageUsage.revertedAt &&
      !packageUsage.revertedConsumptionId,
  );

  return hasActivePointGrant || hasActivePointDeduct || hasActivePackageUsage;
}

async function rebuildOfflineCustomerStats(db: any, customerId: ObjectId, adminId: ObjectId) {
  const records = await db
    .collection("offline_service_records")
    .find(
      { offlineCustomerId: customerId },
      {
        projection: {
          occurredAt: 1,
          createdAt: 1,
          payment: 1,
        },
      },
    )
    .toArray();

  const totalPaid = records.reduce((sum: number, record: any) => {
    if (record.payment?.status !== "paid") return sum;

    const amount = Number(record.payment?.amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const lastVisitedAt =
    records
      .map((record: any) => record.occurredAt ?? record.createdAt)
      .filter(Boolean)
      .map((value: any) => new Date(value))
      .filter((date: Date) => !Number.isNaN(date.getTime()))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0] ?? null;

  await db.collection("offline_customers").updateOne(
    { _id: customerId },
    {
      $set: {
        "stats.visitCount": records.length,
        "stats.totalServiceCount": records.length,
        "stats.totalPaid": totalPaid,
        "stats.lastVisitedAt": lastVisitedAt,
        updatedAt: new Date(),
        updatedBy: adminId,
      },
    },
  );
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids : [];
  const objectIds = toObjectIds(ids);

  if (objectIds.length === 0) {
    return NextResponse.json(
      { message: "삭제할 오프라인 기록을 선택해주세요." },
      { status: 400 },
    );
  }

  const recordsCol = guard.db.collection("offline_service_records");
  const records = await recordsCol
    .find(
      { _id: { $in: objectIds } },
      {
        projection: {
          _id: 1,
          offlineCustomerId: 1,
          customerSnapshot: 1,
          payment: 1,
          points: 1,
          packageUsage: 1,
        },
      },
    )
    .toArray();

  if (records.length === 0) {
    return NextResponse.json(
      { message: "삭제할 오프라인 기록을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const blockedRecords = records.filter(hasActiveLinkedAccounting);
  if (blockedRecords.length > 0) {
    return NextResponse.json(
      {
        message:
          "포인트 또는 패키지 사용 처리 이력이 있는 기록은 먼저 사용/적립 처리를 취소한 뒤 삭제해주세요.",
      },
      { status: 409 },
    );
  }

  const customerIds = Array.from(
    new Map(
      records
        .map((record: any) => record.offlineCustomerId)
        .filter((id: unknown): id is ObjectId => id instanceof ObjectId)
        .map((id: ObjectId) => [String(id), id]),
    ).values(),
  );

  const deleteResult = await recordsCol.deleteMany({
    _id: { $in: records.map((record: any) => record._id) },
  });

  await Promise.all(
    customerIds.map((customerId) =>
      rebuildOfflineCustomerStats(guard.db, customerId, guard.admin._id),
    ),
  );

  await appendAudit(
    guard.db,
    {
      type: "offline_record_bulk_delete",
      actorId: guard.admin._id,
      message: "오프라인 작업/매출 선택 삭제",
      diff: {
        requestedCount: objectIds.length,
        deletedCount: deleteResult.deletedCount,
        ids: records.map((record: any) => String(record._id)),
      },
    },
    req,
  );

  return NextResponse.json({
    success: true,
    deletedCount: deleteResult.deletedCount,
  });
}
