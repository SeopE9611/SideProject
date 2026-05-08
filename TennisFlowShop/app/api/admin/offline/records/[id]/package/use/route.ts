import { NextResponse } from "next/server";
import { ObjectId, type ClientSession } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { consumePass } from "@/lib/passes.service";
import { isTimeExpired } from "@/lib/pass-status";
import type { ServicePass, ServicePassConsumption } from "@/lib/types/pass";

const toObjectId = (value: string) => (ObjectId.isValid(value) ? new ObjectId(value) : null);

class PackageUseError extends Error {
  constructor(
    public status: number,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
  }
}

const emptyPackageUsageFilter = {
  $and: [
    { $or: [{ "packageUsage.passId": { $exists: false } }, { "packageUsage.passId": null }, { "packageUsage.passId": "" }] },
    { $or: [{ "packageUsage.consumptionId": { $exists: false } }, { "packageUsage.consumptionId": null }, { "packageUsage.consumptionId": "" }] },
  ],
};

function serializeRecord(doc: Record<string, any>) {
  return {
    ...doc,
    id: String(doc._id),
    _id: undefined,
    offlineCustomerId: doc.offlineCustomerId ? String(doc.offlineCustomerId) : null,
    userId: doc.userId ? String(doc.userId) : null,
    packageUsage: {
      passId: doc.packageUsage?.passId ? String(doc.packageUsage.passId) : null,
      usedCount: typeof doc.packageUsage?.usedCount === "number" ? doc.packageUsage.usedCount : null,
      consumptionId: doc.packageUsage?.consumptionId ? String(doc.packageUsage.consumptionId) : null,
    },
  };
}

function serializePass(pass: ServicePass) {
  return {
    id: String(pass._id),
    name: pass.meta?.planTitle ?? "교체 서비스 패키지",
    packageName: pass.meta?.planTitle ?? "교체 서비스 패키지",
    status: pass.status,
    totalCount: Number(pass.packageSize ?? 0),
    usedCount: Number(pass.usedCount ?? 0),
    remainingCount: Number(pass.remainingCount ?? 0),
    expiresAt: pass.expiresAt instanceof Date ? pass.expiresAt.toISOString() : pass.expiresAt ?? null,
    createdAt: pass.createdAt instanceof Date ? pass.createdAt.toISOString() : pass.createdAt ?? null,
  };
}

function isDuplicateKeyError(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === 11000;
}

function mapConsumeError(err: any): PackageUseError {
  const code = err?.code || err?.message;
  if (code === "PASS_NOT_FOUND") return new PackageUseError(404, "pass not found", err);
  if (code === "ORDER_NOT_PAID" || code === "PASS_CONSUME_FAILED") return new PackageUseError(409, "package consumption failed", err);
  if (isDuplicateKeyError(err)) return new PackageUseError(409, "package already used for this record", err);
  console.error("[offline package use] consumption failed", err);
  return new PackageUseError(500, "package consumption failed", err);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const recordId = toObjectId((await ctx.params).id);
  if (!recordId) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const passId = typeof body?.passId === "string" ? toObjectId(body.passId) : null;
  if (!passId) return NextResponse.json({ message: "invalid passId" }, { status: 400 });

  const usedCount = body?.usedCount == null ? 1 : Number(body.usedCount);
  if (!Number.isInteger(usedCount) || usedCount !== 1) {
    return NextResponse.json({ message: "invalid usedCount" }, { status: 400 });
  }

  const records = guard.db.collection("offline_service_records");
  const session = guard.db.client.startSession();
  let updatedPass: ServicePass | null = null;
  let updatedRecord: Record<string, any> | null = null;
  let consumption: Pick<ServicePassConsumption, "_id" | "count"> | null = null;
  let offlineCustomerId: ObjectId | null = null;
  let linkedUserId: ObjectId | null = null;
  let previousPackageUsage: { passId: string | null; usedCount: number | null; consumptionId: string | null } | null = null;

  try {
    await session.withTransaction(async () => {
      const record = await records.findOne({ _id: recordId }, { session });
      if (!record) throw new PackageUseError(404, "record not found");

      previousPackageUsage = {
        passId: record.packageUsage?.passId ? String(record.packageUsage.passId) : null,
        usedCount: typeof record.packageUsage?.usedCount === "number" ? record.packageUsage.usedCount : null,
        consumptionId: record.packageUsage?.consumptionId ? String(record.packageUsage.consumptionId) : null,
      };
      if (previousPackageUsage.passId || previousPackageUsage.consumptionId) {
        throw new PackageUseError(409, "package already used for this record");
      }

      offlineCustomerId = record.offlineCustomerId instanceof ObjectId ? record.offlineCustomerId : null;
      if (!offlineCustomerId) throw new PackageUseError(404, "offline customer not found");

      const customer = await guard.db.collection("offline_customers").findOne({ _id: offlineCustomerId }, { projection: { linkedUserId: 1 }, session });
      if (!customer) throw new PackageUseError(404, "offline customer not found");

      linkedUserId = customer.linkedUserId instanceof ObjectId ? customer.linkedUserId : null;
      if (!linkedUserId) throw new PackageUseError(400, "linked user required");

      const user = await guard.db.collection("users").findOne({ _id: linkedUserId }, { projection: { _id: 1 }, session });
      if (!user) throw new PackageUseError(404, "user not found");

      const pass = await guard.db.collection<ServicePass>("service_passes").findOne({ _id: passId }, { session });
      if (!pass) throw new PackageUseError(404, "pass not found");
      if (!pass.userId || String(pass.userId) !== String(linkedUserId)) {
        throw new PackageUseError(403, "pass does not belong to linked user");
      }
      if (pass.status !== "active" || !pass.expiresAt || isTimeExpired(pass.expiresAt)) {
        throw new PackageUseError(409, "pass is not usable");
      }
      if (Number(pass.remainingCount ?? 0) < usedCount) {
        throw new PackageUseError(409, "no remaining pass count");
      }

      try {
        updatedPass = await consumePass(guard.db, passId, recordId, usedCount, { session });
      } catch (err: any) {
        throw mapConsumeError(err);
      }

      consumption = await guard.db.collection<ServicePassConsumption>("service_pass_consumptions").findOne(
        { passId, applicationId: recordId, $or: [{ reverted: { $exists: false } }, { reverted: false }] } as any,
        { projection: { _id: 1, count: 1 }, session },
      );
      if (!consumption) {
        throw new PackageUseError(500, "package consumption failed");
      }

      const now = new Date();
      const updateResult = await records.updateOne(
        { _id: recordId, ...emptyPackageUsageFilter },
        { $set: { "packageUsage.passId": passId, "packageUsage.usedCount": usedCount, "packageUsage.consumptionId": consumption._id, updatedAt: now, updatedBy: guard.admin._id } },
        { session },
      );
      if (updateResult.matchedCount === 0) {
        throw new PackageUseError(409, "package already used for this record");
      }

      updatedRecord = await records.findOne({ _id: recordId }, { session });
      if (!updatedRecord) throw new PackageUseError(404, "record not found");
    });
  } catch (err) {
    if (err instanceof PackageUseError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("[offline package use] transaction failed", err);
    return NextResponse.json({ message: "package consumption failed" }, { status: 500 });
  } finally {
    await session.endSession();
  }

  if (!updatedRecord || !updatedPass || !consumption || !offlineCustomerId || !linkedUserId) {
    console.error("[offline package use] transaction completed without response payload", { recordId: String(recordId), passId: String(passId) });
    return NextResponse.json({ message: "package consumption failed" }, { status: 500 });
  }

  const finalRecord = updatedRecord as Record<string, any>;
  const finalPass = updatedPass as ServicePass;
  const finalConsumption = consumption as Pick<ServicePassConsumption, "_id" | "count">;
  const finalOfflineCustomerId = offlineCustomerId as ObjectId;
  const finalLinkedUserId = linkedUserId as ObjectId;
  const nextPackageUsage = { passId, usedCount, consumptionId: finalConsumption._id };
  await appendAudit(guard.db, {
    type: "offline_record_package_use",
    actorId: guard.admin._id,
    targetId: recordId,
    message: "오프라인 기록 패키지 사용 처리",
    diff: {
      offlineRecordId: String(recordId),
      offlineCustomerId: String(finalOfflineCustomerId),
      linkedUserId: String(finalLinkedUserId),
      passId: String(passId),
      usedCount,
      consumptionId: String(finalConsumption._id),
      previousPackageUsage,
      nextPackageUsage: {
        passId: String(nextPackageUsage.passId),
        usedCount: nextPackageUsage.usedCount,
        consumptionId: String(nextPackageUsage.consumptionId),
      },
    },
  }, req);

  return NextResponse.json({
    item: serializeRecord(finalRecord as any),
    pass: serializePass(finalPass),
    consumption: { id: String(finalConsumption._id), usedCount: Number(finalConsumption.count ?? usedCount) },
  });
}
