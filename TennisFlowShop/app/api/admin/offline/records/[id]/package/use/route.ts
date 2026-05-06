import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { consumePass } from "@/lib/passes.service";
import { isTimeExpired } from "@/lib/pass-status";
import type { ServicePass } from "@/lib/types/pass";

const toObjectId = (value: string) => (ObjectId.isValid(value) ? new ObjectId(value) : null);

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
  const record = await records.findOne({ _id: recordId });
  if (!record) return NextResponse.json({ message: "record not found" }, { status: 404 });

  const previousPackageUsage = {
    passId: record.packageUsage?.passId ? String(record.packageUsage.passId) : null,
    usedCount: typeof record.packageUsage?.usedCount === "number" ? record.packageUsage.usedCount : null,
    consumptionId: record.packageUsage?.consumptionId ? String(record.packageUsage.consumptionId) : null,
  };
  if (previousPackageUsage.passId || previousPackageUsage.consumptionId) {
    return NextResponse.json({ message: "package already used for this record" }, { status: 409 });
  }

  const offlineCustomerId = record.offlineCustomerId instanceof ObjectId ? record.offlineCustomerId : null;
  if (!offlineCustomerId) return NextResponse.json({ message: "offline customer not found" }, { status: 404 });

  const customer = await guard.db.collection("offline_customers").findOne({ _id: offlineCustomerId }, { projection: { linkedUserId: 1 } });
  if (!customer) return NextResponse.json({ message: "offline customer not found" }, { status: 404 });

  const linkedUserId = customer.linkedUserId instanceof ObjectId ? customer.linkedUserId : null;
  if (!linkedUserId) return NextResponse.json({ message: "linked user required" }, { status: 400 });

  const user = await guard.db.collection("users").findOne({ _id: linkedUserId }, { projection: { _id: 1 } });
  if (!user) return NextResponse.json({ message: "user not found" }, { status: 404 });

  const pass = await guard.db.collection<ServicePass>("service_passes").findOne({ _id: passId });
  if (!pass) return NextResponse.json({ message: "pass not found" }, { status: 404 });
  if (!pass.userId || String(pass.userId) !== String(linkedUserId)) {
    return NextResponse.json({ message: "pass does not belong to linked user" }, { status: 403 });
  }
  if (pass.status !== "active" || !pass.expiresAt || isTimeExpired(pass.expiresAt)) {
    return NextResponse.json({ message: "pass is not usable" }, { status: 409 });
  }
  if (Number(pass.remainingCount ?? 0) < usedCount) {
    return NextResponse.json({ message: "no remaining pass count" }, { status: 409 });
  }

  const now = new Date();
  const claimResult = await records.updateOne(
    {
      _id: recordId,
      $and: [
        { $or: [{ "packageUsage.passId": { $exists: false } }, { "packageUsage.passId": null }, { "packageUsage.passId": "" }] },
        { $or: [{ "packageUsage.consumptionId": { $exists: false } }, { "packageUsage.consumptionId": null }, { "packageUsage.consumptionId": "" }] },
      ],
    },
    { $set: { "packageUsage.passId": passId, "packageUsage.usedCount": usedCount, "packageUsage.consumptionId": null, updatedAt: now, updatedBy: guard.admin._id } },
  );
  if (claimResult.matchedCount === 0) {
    return NextResponse.json({ message: "package already used for this record" }, { status: 409 });
  }

  let updatedPass: ServicePass;
  try {
    updatedPass = await consumePass(guard.db, passId, recordId, usedCount);
  } catch (err: any) {
    await records.updateOne(
      { _id: recordId, "packageUsage.passId": passId, "packageUsage.consumptionId": null },
      { $unset: { packageUsage: "" }, $set: { updatedAt: new Date(), updatedBy: guard.admin._id } },
    );
    const code = err?.code || err?.message;
    if (code === "PASS_NOT_FOUND") return NextResponse.json({ message: "pass not found" }, { status: 404 });
    if (code === "ORDER_NOT_PAID" || code === "PASS_CONSUME_FAILED") return NextResponse.json({ message: "package consumption failed" }, { status: 409 });
    if (isDuplicateKeyError(err)) return NextResponse.json({ message: "package already used for this record" }, { status: 409 });
    console.error("[offline package use] consumption failed", err);
    return NextResponse.json({ message: "package consumption failed" }, { status: 500 });
  }

  const consumption = await guard.db.collection("service_pass_consumptions").findOne(
    { passId, applicationId: recordId },
    { projection: { _id: 1, count: 1 } },
  );
  if (!consumption) {
    return NextResponse.json({ message: "package consumption failed" }, { status: 500 });
  }

  const nextPackageUsage = { passId, usedCount, consumptionId: consumption._id };
  const updateResult = await records.updateOne(
    { _id: recordId, "packageUsage.passId": passId, "packageUsage.consumptionId": null },
    { $set: { "packageUsage.consumptionId": consumption._id, updatedAt: new Date(), updatedBy: guard.admin._id } },
  );
  if (updateResult.matchedCount === 0) {
    console.error("[offline package use] record update failed after consumption", { recordId: String(recordId), passId: String(passId), consumptionId: String(consumption._id) });
    return NextResponse.json({ message: "package consumption failed" }, { status: 500 });
  }

  const updatedRecord = await records.findOne({ _id: recordId });
  if (!updatedRecord) return NextResponse.json({ message: "record not found" }, { status: 404 });

  await appendAudit(guard.db, {
    type: "offline_record_package_use",
    actorId: guard.admin._id,
    targetId: recordId,
    message: "오프라인 기록 패키지 사용 처리",
    diff: {
      offlineRecordId: String(recordId),
      offlineCustomerId: String(offlineCustomerId),
      linkedUserId: String(linkedUserId),
      passId: String(passId),
      usedCount,
      consumptionId: String(consumption._id),
      previousPackageUsage,
      nextPackageUsage: {
        passId: String(nextPackageUsage.passId),
        usedCount: nextPackageUsage.usedCount,
        consumptionId: String(nextPackageUsage.consumptionId),
      },
    },
  }, req);

  return NextResponse.json({
    item: serializeRecord(updatedRecord as any),
    pass: serializePass(updatedPass),
    consumption: { id: String(consumption._id), usedCount: Number(consumption.count ?? usedCount) },
  });
}
