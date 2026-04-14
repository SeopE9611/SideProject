import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { issuePassesForPaidPackageOrder } from "@/lib/passes.service";
import type { PackageOrder } from "@/lib/types/package-order";
import { ServicePass } from "@/lib/types/pass";
import { shouldRestoreActive } from "@/lib/pass-status";

function normalizePassStatus(
  status: ServicePass["status"],
): "active" | "paused" | "cancelled" | "expired" {
  if (status === "suspended") return "paused";
  return status;
}

function getStoredRemainingForResume(passDoc: ServicePass, now: Date): number {
  if (
    typeof passDoc.remainingValidityMs === "number" &&
    passDoc.remainingValidityMs >= 0
  )
    return passDoc.remainingValidityMs;
  if (passDoc.expiresAt instanceof Date)
    return Math.max(0, passDoc.expiresAt.getTime() - now.getTime());
  return 0;
}

export async function markPackageOrderPaid(
  db: Db,
  params: {
    packageOrderId: ObjectId | string;
    actorLabel?: string;
    reason?: string;
    paymentInfoPatch?: Partial<PackageOrder["paymentInfo"]>;
  },
) {
  const _id =
    typeof params.packageOrderId === "string"
      ? new ObjectId(params.packageOrderId)
      : params.packageOrderId;
  const packageOrders = db.collection<PackageOrder>("packageOrders");

  const pkgOrder = await packageOrders.findOne({ _id });
  if (!pkgOrder) throw new Error("PACKAGE_ORDER_NOT_FOUND");

  const now = new Date();
  const prevPayment = pkgOrder.paymentStatus ?? "결제대기";
  const historyDesc =
    `결제 상태 ${prevPayment} → 결제완료` +
    (params.reason ? ` / 사유: ${params.reason}` : "") +
    (params.actorLabel ? ` / 처리자: ${params.actorLabel}` : "");

  const nextPaymentInfo = {
    ...(pkgOrder.paymentInfo ?? {}),
    ...(params.paymentInfoPatch ?? {}),
  };

  await packageOrders.updateOne(
    { _id },
    {
      $set: {
        status: "결제완료",
        paymentStatus: "결제완료",
        paymentInfo: nextPaymentInfo,
        updatedAt: now,
      },
      $push: {
        history: {
          status: "결제완료",
          date: now,
          description: historyDesc,
        } satisfies PackageOrder["history"][number],
      },
    },
  );

  await issuePassesForPaidPackageOrder(db, { ...pkgOrder, _id });

  const passCol = db.collection<ServicePass>("service_passes");
  const passDoc = await passCol.findOne({ orderId: _id });
  if (!passDoc) return;

  const hasPositiveRemaining = (passDoc.remainingCount ?? 0) > 0;
  if (!hasPositiveRemaining) return;

  const normalizedStatus = normalizePassStatus(passDoc.status);
  const shouldActivate =
    normalizedStatus !== "cancelled" &&
    shouldRestoreActive({
      paymentStatus: "결제완료",
      passStatus: passDoc.status,
      remainingCount: passDoc.remainingCount,
      expiresAt: passDoc.expiresAt,
      now,
    });

  if (!shouldActivate) return;

  const resumeMs = getStoredRemainingForResume(passDoc, now);
  const nextExpiry =
    normalizedStatus === "active"
      ? passDoc.expiresAt
      : resumeMs > 0
        ? new Date(now.getTime() + resumeMs)
        : null;

  await passCol.updateOne(
    { _id: passDoc._id },
    {
      $set: {
        status: "active",
        activatedAt: passDoc.activatedAt ?? now,
        expiresAt: nextExpiry,
        remainingValidityMs: null,
        updatedAt: now,
      },
    },
  );
}
