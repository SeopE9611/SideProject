import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { revertConsumption } from "@/lib/passes.service";
import type { ServicePass, ServicePassConsumption } from "@/lib/types/pass";

const revertSchema = z.object({
  reason: z.string().trim().min(1, "revert reason required").max(500),
});

const toObjectId = (value: string) => (ObjectId.isValid(value) ? new ObjectId(value) : null);

class PackageRevertError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function serializeRecord(doc: Record<string, any>) {
  return {
    ...doc,
    id: String(doc._id),
    _id: undefined,
    offlineCustomerId: doc.offlineCustomerId ? String(doc.offlineCustomerId) : null,
    userId: doc.userId ? String(doc.userId) : null,
    packageUsage: doc.packageUsage
      ? {
          passId: doc.packageUsage.passId ? String(doc.packageUsage.passId) : null,
          usedCount: typeof doc.packageUsage.usedCount === "number" ? doc.packageUsage.usedCount : null,
          consumptionId: doc.packageUsage.consumptionId ? String(doc.packageUsage.consumptionId) : null,
          revertedAt: doc.packageUsage.revertedAt instanceof Date ? doc.packageUsage.revertedAt.toISOString() : doc.packageUsage.revertedAt ?? null,
          revertedBy: doc.packageUsage.revertedBy ? String(doc.packageUsage.revertedBy) : null,
          revertReason: doc.packageUsage.revertReason ?? null,
          revertedConsumptionId: doc.packageUsage.revertedConsumptionId ? String(doc.packageUsage.revertedConsumptionId) : null,
          isReverted: Boolean(doc.packageUsage.revertedAt || doc.packageUsage.reverted),
        }
      : null,
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

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const recordId = toObjectId((await ctx.params).id);
  if (!recordId) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = revertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 400 });

  const records = guard.db.collection("offline_service_records");
  const passes = guard.db.collection<ServicePass>("service_passes");
  const consumptions = guard.db.collection<ServicePassConsumption>("service_pass_consumptions");
  const session = guard.db.client.startSession();

  let updatedRecord: Record<string, any> | null = null;
  let updatedPass: ServicePass | null = null;
  let updatedConsumption: ServicePassConsumption | null = null;
  let offlineCustomerId: ObjectId | null = null;
  let linkedUserId: ObjectId | null = null;
  let passId: ObjectId | null = null;
  let consumptionId: ObjectId | null = null;
  let previousPackageUsage: Record<string, any> | null = null;

  try {
    await session.withTransaction(async () => {
      const record = await records.findOne({ _id: recordId }, { session });
      if (!record) throw new PackageRevertError(404, "record not found");
      if (!record.packageUsage) throw new PackageRevertError(404, "package usage not found");
      if (record.packageUsage.revertedAt || record.packageUsage.reverted === true) {
        throw new PackageRevertError(409, "package usage already reverted");
      }

      passId = record.packageUsage.passId instanceof ObjectId ? record.packageUsage.passId : toObjectId(String(record.packageUsage.passId ?? ""));
      consumptionId = record.packageUsage.consumptionId instanceof ObjectId ? record.packageUsage.consumptionId : toObjectId(String(record.packageUsage.consumptionId ?? ""));
      if (!passId || !consumptionId) throw new PackageRevertError(404, "package usage not found");

      previousPackageUsage = {
        passId: String(passId),
        usedCount: typeof record.packageUsage.usedCount === "number" ? record.packageUsage.usedCount : null,
        consumptionId: String(consumptionId),
      };

      offlineCustomerId = record.offlineCustomerId instanceof ObjectId ? record.offlineCustomerId : null;
      if (!offlineCustomerId) throw new PackageRevertError(404, "offline customer not found");

      const customer = await guard.db.collection("offline_customers").findOne({ _id: offlineCustomerId }, { projection: { linkedUserId: 1 }, session });
      if (!customer) throw new PackageRevertError(404, "offline customer not found");
      linkedUserId = customer.linkedUserId instanceof ObjectId ? customer.linkedUserId : null;
      if (!linkedUserId) throw new PackageRevertError(400, "linked user required");

      const consumption = await consumptions.findOne({ _id: consumptionId }, { session });
      if (!consumption) throw new PackageRevertError(404, "consumption not found");
      if (consumption.reverted === true) throw new PackageRevertError(409, "consumption already reverted");
      if (!consumption.passId || String(consumption.passId) !== String(passId)) {
        throw new PackageRevertError(409, "consumption pass mismatch");
      }
      if (!consumption.applicationId || String(consumption.applicationId) !== String(recordId)) {
        throw new PackageRevertError(409, "consumption application mismatch");
      }

      const pass = await passes.findOne({ _id: passId }, { session });
      if (!pass) throw new PackageRevertError(404, "pass not found");
      if (!pass.userId || String(pass.userId) !== String(linkedUserId)) {
        throw new PackageRevertError(403, "pass does not belong to linked user");
      }

      await revertConsumption(guard.db, passId, recordId, { session });

      const now = new Date();
      const updateResult = await records.updateOne(
        {
          _id: recordId,
          "packageUsage.consumptionId": consumptionId,
          $or: [{ "packageUsage.revertedAt": { $exists: false } }, { "packageUsage.revertedAt": null }],
        },
        {
          $set: {
            "packageUsage.reverted": true,
            "packageUsage.revertedAt": now,
            "packageUsage.revertedBy": guard.admin._id,
            "packageUsage.revertReason": parsed.data.reason,
            "packageUsage.revertedConsumptionId": consumptionId,
            updatedAt: now,
            updatedBy: guard.admin._id,
          },
        },
        { session },
      );
      if (updateResult.matchedCount === 0) throw new PackageRevertError(409, "package usage already reverted");

      updatedRecord = await records.findOne({ _id: recordId }, { session });
      updatedPass = await passes.findOne({ _id: passId }, { session });
      updatedConsumption = await consumptions.findOne({ _id: consumptionId }, { session });
      if (!updatedRecord || !updatedPass || !updatedConsumption?.reverted) {
        throw new PackageRevertError(500, "package usage revert failed");
      }
    });
  } catch (err) {
    if (err instanceof PackageRevertError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("[offline package revert] transaction failed", err);
    return NextResponse.json({ message: "package usage revert failed" }, { status: 500 });
  } finally {
    await session.endSession();
  }

  if (!updatedRecord || !updatedPass || !updatedConsumption || !offlineCustomerId || !linkedUserId || !passId || !consumptionId) {
    console.error("[offline package revert] transaction completed without response payload", { recordId: String(recordId) });
    return NextResponse.json({ message: "package usage revert failed" }, { status: 500 });
  }

  const finalRecord = updatedRecord as Record<string, any>;
  const finalPass = updatedPass as ServicePass;
  const finalConsumption = updatedConsumption as ServicePassConsumption;
  const finalOfflineCustomerId = offlineCustomerId as ObjectId;
  const finalLinkedUserId = linkedUserId as ObjectId;
  const finalPassId = passId as ObjectId;
  const finalConsumptionId = consumptionId as ObjectId;

  await appendAudit(guard.db, {
    type: "offline_record_package_revert",
    actorId: guard.admin._id,
    targetId: recordId,
    message: "오프라인 기록 패키지 사용 취소",
    diff: {
      offlineRecordId: String(recordId),
      offlineCustomerId: String(finalOfflineCustomerId),
      linkedUserId: String(finalLinkedUserId),
      passId: String(finalPassId),
      consumptionId: String(finalConsumptionId),
      reason: parsed.data.reason,
      previousPackageUsage,
      nextPackageUsage: serializeRecord(finalRecord).packageUsage,
    },
  }, req);

  return NextResponse.json({
    item: serializeRecord(finalRecord),
    pass: serializePass(finalPass),
    consumption: { id: String(finalConsumption._id), reverted: true },
  });
}
