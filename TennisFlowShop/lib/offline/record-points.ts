import { NextResponse } from "next/server";
import { ObjectId, type Db } from "mongodb";
import { appendAudit } from "@/lib/audit";
import { deductPoints, getPointsBalance, grantPoints } from "@/lib/points.service";

type AdminActor = { _id: ObjectId };

type PointMode = "grant" | "deduct";
type PointRevertMode = "grant" | "deduct";

type PointBody = {
  amount?: unknown;
  reason?: unknown;
};

const DEFAULT_REASONS: Record<PointMode, string> = {
  grant: "오프라인 작업 포인트 적립",
  deduct: "오프라인 작업 포인트 사용",
};

const AUDIT_TYPES: Record<PointMode, string> = {
  grant: "offline_record_points_grant",
  deduct: "offline_record_points_deduct",
};

const AUDIT_MESSAGES: Record<PointMode, string> = {
  grant: "오프라인 작업 포인트 적립",
  deduct: "오프라인 작업 포인트 사용",
};

function isDuplicateKeyError(error: any) {
  return error?.code === 11000 || /E11000 duplicate key/i.test(String(error?.message ?? ""));
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

function sanitizePoints(points: any) {
  return {
    earn: typeof points?.earn === "number" ? points.earn : null,
    use: typeof points?.use === "number" ? points.use : null,
    grantTxId: points?.grantTxId ? String(points.grantTxId) : null,
    deductTxId: points?.deductTxId ? String(points.deductTxId) : null,
    grantRevertTxId: points?.grantRevertTxId ? String(points.grantRevertTxId) : null,
    grantRevertedAt: serializeDate(points?.grantRevertedAt),
    grantRevertedBy: points?.grantRevertedBy ? String(points.grantRevertedBy) : null,
    grantRevertReason: typeof points?.grantRevertReason === "string" ? points.grantRevertReason : null,
    deductRevertTxId: points?.deductRevertTxId ? String(points.deductRevertTxId) : null,
    deductRevertedAt: serializeDate(points?.deductRevertedAt),
    deductRevertedBy: points?.deductRevertedBy ? String(points.deductRevertedBy) : null,
    deductRevertReason: typeof points?.deductRevertReason === "string" ? points.deductRevertReason : null,
  };
}

function formatLineSummary(lines?: Array<{ racketName?: string; stringName?: string; tensionMain?: string; tensionCross?: string }>): string {
  if (!Array.isArray(lines) || lines.length === 0) return "작업 내용 미입력";
  const summary = lines
    .map((line) => {
      const main = String(line.tensionMain ?? "").trim();
      const cross = String(line.tensionCross ?? "").trim();
      const tension = main || cross ? `${main || "-"}/${cross || "-"}` : "";
      return [String(line.racketName ?? "").trim(), String(line.stringName ?? "").trim(), tension].filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join(", ");
  return summary || "작업 내용 미입력";
}

export function serializeOfflineRecord(doc: Record<string, any>) {
  return {
    id: String(doc._id),
    offlineCustomerId: doc.offlineCustomerId ? String(doc.offlineCustomerId) : null,
    kind: doc.kind,
    status: doc.status,
    occurredAt: serializeDate(doc.occurredAt),
    customerSnapshot: doc.customerSnapshot ?? null,
    lines: Array.isArray(doc.lines) ? doc.lines : [],
    lineSummary: formatLineSummary(doc.lines),
    payment: doc.payment ?? null,
    points: sanitizePoints(doc.points),
    memo: doc.memo ?? "",
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
  };
}

function parseAmount(body: PointBody | null) {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) return null;
  return amount;
}

export async function handleOfflineRecordPoints(
  req: Request,
  db: Db,
  admin: AdminActor,
  recordId: string,
  mode: PointMode,
) {
  if (!ObjectId.isValid(recordId)) {
    return NextResponse.json({ message: "invalid record id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as PointBody | null;
  const amount = parseAmount(body);
  if (!amount) return NextResponse.json({ message: "invalid amount" }, { status: 400 });

  const reasonRaw = typeof body?.reason === "string" ? body.reason.trim() : "";
  const reason = reasonRaw || DEFAULT_REASONS[mode];
  const recordObjectId = new ObjectId(recordId);

  const record = await db.collection("offline_service_records").findOne({ _id: recordObjectId });
  if (!record) return NextResponse.json({ message: "record not found" }, { status: 404 });

  const previousPointsState = sanitizePoints((record as any).points);
  if (mode === "grant" && previousPointsState.grantTxId) {
    return NextResponse.json({ message: "points already granted for this record" }, { status: 409 });
  }
  if (mode === "deduct" && previousPointsState.deductTxId) {
    return NextResponse.json({ message: "points already deducted for this record" }, { status: 409 });
  }

  const offlineCustomerId = (record as any).offlineCustomerId instanceof ObjectId ? (record as any).offlineCustomerId : null;
  if (!offlineCustomerId) return NextResponse.json({ message: "offline customer not found" }, { status: 404 });

  const customer = await db.collection("offline_customers").findOne(
    { _id: offlineCustomerId },
    { projection: { linkedUserId: 1 } },
  );
  if (!customer) return NextResponse.json({ message: "offline customer not found" }, { status: 404 });

  const linkedUserId = (customer as any).linkedUserId instanceof ObjectId ? (customer as any).linkedUserId : null;
  if (!linkedUserId) return NextResponse.json({ message: "linked user required" }, { status: 400 });

  const user = await db.collection("users").findOne({ _id: linkedUserId }, { projection: { _id: 1, pointsBalance: 1 } });
  if (!user) return NextResponse.json({ message: "user not found" }, { status: 404 });

  const refKey = `offline:${mode}:${recordId}`;
  let transactionId: string | null = null;
  try {
    if (mode === "grant") {
      const result = await grantPoints(db, {
        userId: linkedUserId,
        amount,
        type: "admin_adjust",
        refKey,
        reason,
        ref: { adminId: admin._id, offlineRecordId: recordObjectId, offlineCustomerId },
      });
      if (result.duplicated || !result.transactionId) {
        return NextResponse.json({ message: "points already granted for this record" }, { status: 409 });
      }
      transactionId = result.transactionId;
    } else {
      const result = await deductPoints(db, {
        userId: linkedUserId,
        amount,
        type: "admin_adjust",
        refKey,
        reason,
        ref: { adminId: admin._id, offlineRecordId: recordObjectId, offlineCustomerId },
        allowNegativeBalance: false,
      });
      transactionId = result.transactionId;
    }
  } catch (err: any) {
    const code = err?.code || err?.message;
    if (code === "INVALID_AMOUNT") return NextResponse.json({ message: "invalid amount" }, { status: 400 });
    if (code === "USER_NOT_FOUND") return NextResponse.json({ message: "user not found" }, { status: 404 });
    if (code === "INSUFFICIENT_POINTS") return NextResponse.json({ message: "insufficient points" }, { status: 409 });
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { message: mode === "grant" ? "points already granted for this record" : "points already deducted for this record" },
        { status: 409 },
      );
    }
    console.error(`[offline record points:${mode}] transaction failed`, err);
    return NextResponse.json({ message: "points transaction failed" }, { status: 500 });
  }

  const now = new Date();
  const pointSet = mode === "grant"
    ? { "points.earn": amount, "points.grantTxId": transactionId }
    : { "points.use": amount, "points.deductTxId": transactionId };

  const updateResult = await db.collection("offline_service_records").updateOne(
    {
      _id: recordObjectId,
      $or: mode === "grant"
        ? [{ "points.grantTxId": { $exists: false } }, { "points.grantTxId": null }, { "points.grantTxId": "" }]
        : [{ "points.deductTxId": { $exists: false } }, { "points.deductTxId": null }, { "points.deductTxId": "" }],
    },
    { $set: { ...pointSet, updatedAt: now, updatedBy: admin._id } },
  );

  if (updateResult.matchedCount === 0) {
    return NextResponse.json(
      { message: mode === "grant" ? "points already granted for this record" : "points already deducted for this record" },
      { status: 409 },
    );
  }

  const [updatedRecord, balance] = await Promise.all([
    db.collection("offline_service_records").findOne({ _id: recordObjectId }),
    getPointsBalance(db, linkedUserId),
  ]);
  if (!updatedRecord) return NextResponse.json({ message: "record not found" }, { status: 404 });

  const nextPointsState = sanitizePoints((updatedRecord as any).points);
  await appendAudit(db, {
    type: AUDIT_TYPES[mode],
    actorId: admin._id,
    targetId: recordObjectId,
    message: AUDIT_MESSAGES[mode],
    diff: {
      offlineRecordId: recordId,
      offlineCustomerId: String(offlineCustomerId),
      linkedUserId: String(linkedUserId),
      amount,
      transactionId,
      previousPointsState,
      nextPointsState,
    },
  }, req);

  return NextResponse.json({
    item: serializeOfflineRecord(updatedRecord as any),
    balance,
    transaction: { id: transactionId, amount: mode === "grant" ? amount : -amount },
  });
}

type PointRevertBody = {
  reason?: unknown;
};

const REVERT_AUDIT_TYPES: Record<PointRevertMode, string> = {
  grant: "offline_record_points_grant_revert",
  deduct: "offline_record_points_deduct_revert",
};

const REVERT_AUDIT_MESSAGES: Record<PointRevertMode, string> = {
  grant: "오프라인 작업 포인트 적립 취소",
  deduct: "오프라인 작업 포인트 사용 취소",
};

async function findPointTransaction(db: Db, txId: string) {
  const filter = ObjectId.isValid(txId) ? { _id: new ObjectId(txId) } : { _id: txId as any };
  return db.collection("points_transactions").findOne(filter as any, { projection: { _id: 1 } });
}

export async function handleOfflineRecordPointRevert(
  req: Request,
  db: Db,
  admin: AdminActor,
  recordId: string,
  mode: PointRevertMode,
) {
  if (!ObjectId.isValid(recordId)) {
    return NextResponse.json({ message: "invalid record id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as PointRevertBody | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ message: "revert reason required" }, { status: 400 });

  const recordObjectId = new ObjectId(recordId);
  const record = await db.collection("offline_service_records").findOne({ _id: recordObjectId });
  if (!record) return NextResponse.json({ message: "record not found" }, { status: 404 });

  const previousPointsState = sanitizePoints((record as any).points);
  const originalTxId = mode === "grant" ? previousPointsState.grantTxId : previousPointsState.deductTxId;
  const amount = mode === "grant" ? previousPointsState.earn : previousPointsState.use;
  if (!originalTxId || !amount || amount < 1) {
    return NextResponse.json(
      { message: mode === "grant" ? "points grant not found" : "points deduction not found" },
      { status: 404 },
    );
  }
  if (mode === "grant" && (previousPointsState.grantRevertedAt || previousPointsState.grantRevertTxId)) {
    return NextResponse.json({ message: "points grant already reverted" }, { status: 409 });
  }
  if (mode === "deduct" && (previousPointsState.deductRevertedAt || previousPointsState.deductRevertTxId)) {
    return NextResponse.json({ message: "points deduction already reverted" }, { status: 409 });
  }

  const offlineCustomerId = (record as any).offlineCustomerId instanceof ObjectId ? (record as any).offlineCustomerId : null;
  if (!offlineCustomerId) return NextResponse.json({ message: "offline customer not found" }, { status: 404 });

  const customer = await db.collection("offline_customers").findOne(
    { _id: offlineCustomerId },
    { projection: { linkedUserId: 1 } },
  );
  if (!customer) return NextResponse.json({ message: "offline customer not found" }, { status: 404 });

  const linkedUserId = (customer as any).linkedUserId instanceof ObjectId ? (customer as any).linkedUserId : null;
  if (!linkedUserId) return NextResponse.json({ message: "linked user required" }, { status: 400 });

  const user = await db.collection("users").findOne({ _id: linkedUserId }, { projection: { _id: 1, pointsBalance: 1 } });
  if (!user) return NextResponse.json({ message: "user not found" }, { status: 404 });

  const originalTx = await findPointTransaction(db, originalTxId);
  if (!originalTx) {
    return NextResponse.json(
      { message: mode === "grant" ? "points grant not found" : "points deduction not found" },
      { status: 404 },
    );
  }

  const balanceBefore = await getPointsBalance(db, linkedUserId);
  if (mode === "grant" && balanceBefore < amount) {
    return NextResponse.json({ message: "insufficient points to revert grant" }, { status: 409 });
  }

  const refKey = `offline:${mode}-revert:${recordId}`;
  let transactionId: string | null = null;
  try {
    if (mode === "grant") {
      const result = await deductPoints(db, {
        userId: linkedUserId,
        amount,
        type: "admin_adjust",
        refKey,
        reason: `오프라인 포인트 적립 취소: ${reason}`,
        ref: { adminId: admin._id, offlineRecordId: recordObjectId, offlineCustomerId },
        allowNegativeBalance: false,
      });
      transactionId = result.transactionId;
    } else {
      const result = await grantPoints(db, {
        userId: linkedUserId,
        amount,
        type: "admin_adjust",
        refKey,
        reason: `오프라인 포인트 사용 취소: ${reason}`,
        ref: { adminId: admin._id, offlineRecordId: recordObjectId, offlineCustomerId },
      });
      if (result.duplicated || !result.transactionId) {
        return NextResponse.json({ message: "points deduction already reverted" }, { status: 409 });
      }
      transactionId = result.transactionId;
    }
  } catch (err: any) {
    const code = err?.code || err?.message;
    if (code === "INVALID_AMOUNT") return NextResponse.json({ message: "invalid amount" }, { status: 400 });
    if (code === "USER_NOT_FOUND") return NextResponse.json({ message: "user not found" }, { status: 404 });
    if (code === "INSUFFICIENT_POINTS") return NextResponse.json({ message: "insufficient points to revert grant" }, { status: 409 });
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { message: mode === "grant" ? "points grant already reverted" : "points deduction already reverted" },
        { status: 409 },
      );
    }
    console.error(`[offline record points:${mode}:revert] transaction failed`, err);
    return NextResponse.json({ message: "points revert failed" }, { status: 500 });
  }

  const now = new Date();
  const pointSet = mode === "grant"
    ? {
        "points.grantRevertTxId": transactionId,
        "points.grantRevertedAt": now,
        "points.grantRevertedBy": admin._id,
        "points.grantRevertReason": reason,
      }
    : {
        "points.deductRevertTxId": transactionId,
        "points.deductRevertedAt": now,
        "points.deductRevertedBy": admin._id,
        "points.deductRevertReason": reason,
      };

  const updateResult = await db.collection("offline_service_records").updateOne(
    {
      _id: recordObjectId,
      ...(mode === "grant"
        ? {
            "points.grantTxId": previousPointsState.grantTxId,
            $or: [{ "points.grantRevertTxId": { $exists: false } }, { "points.grantRevertTxId": null }, { "points.grantRevertTxId": "" }],
          }
        : {
            "points.deductTxId": previousPointsState.deductTxId,
            $or: [{ "points.deductRevertTxId": { $exists: false } }, { "points.deductRevertTxId": null }, { "points.deductRevertTxId": "" }],
          }),
    },
    { $set: { ...pointSet, updatedAt: now, updatedBy: admin._id } },
  );

  if (updateResult.matchedCount === 0) {
    return NextResponse.json(
      { message: mode === "grant" ? "points grant already reverted" : "points deduction already reverted" },
      { status: 409 },
    );
  }

  const [updatedRecord, balance] = await Promise.all([
    db.collection("offline_service_records").findOne({ _id: recordObjectId }),
    getPointsBalance(db, linkedUserId),
  ]);
  if (!updatedRecord) return NextResponse.json({ message: "record not found" }, { status: 404 });

  const nextPointsState = sanitizePoints((updatedRecord as any).points);
  await appendAudit(db, {
    type: REVERT_AUDIT_TYPES[mode],
    actorId: admin._id,
    targetId: recordObjectId,
    message: REVERT_AUDIT_MESSAGES[mode],
    diff: {
      offlineRecordId: recordId,
      offlineCustomerId: String(offlineCustomerId),
      linkedUserId: String(linkedUserId),
      originalTxId,
      revertTxId: transactionId,
      amount,
      reason,
      previousPointsState,
      nextPointsState,
    },
  }, req);

  return NextResponse.json({
    item: serializeOfflineRecord(updatedRecord as any),
    balance,
    transaction: { id: transactionId, amount: mode === "grant" ? -amount : amount },
  });
}
