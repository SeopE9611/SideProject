import { NextResponse } from "next/server";
import { ClientSession, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { grantPoints } from "@/lib/points.service";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { cancelNicePaymentByTid, getNicePaymentByTid } from "@/lib/payments/nice/server";

class RentalCancelFinalizationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function normalizeNiceStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace("partialcancelled", "partialcanceled")
    .replace("cancelled", "canceled");
}

function isNiceCancelConfirmed(rental: any) {
  return (
    rental?.paymentStatus === "결제취소" &&
    normalizeNiceStatus(rental?.paymentInfo?.status) === "canceled" &&
    normalizeNiceStatus(rental?.paymentInfo?.niceSync?.pgStatus) === "canceled"
  );
}

function createNiceCancelOrderId(rentalId: unknown) {
  const suffix = String(rentalId ?? "").replace(/[^0-9a-zA-Z]/g, "").slice(-16);
  return `C${Date.now()}${suffix}${Math.random().toString(36).slice(2, 8)}`.slice(0, 64);
}

async function restoreRentalStock(
  db: any,
  existing: any,
  now: Date,
  session: ClientSession,
) {
  const stockDeduction = existing?.stringing?.stockDeduction;
  const isVariant = String(stockDeduction?.mode ?? "") === "variant";
  const selectedColor =
    typeof (isVariant ? stockDeduction?.colorValue : existing?.stringing?.selectedColor) ===
      "string" &&
    String(isVariant ? stockDeduction?.colorValue : existing?.stringing?.selectedColor).trim()
      ? String(isVariant ? stockDeduction?.colorValue : existing?.stringing?.selectedColor).trim()
      : null;
  const selectedGauge =
    typeof (isVariant ? stockDeduction?.gaugeValue : existing?.stringing?.selectedGauge) ===
      "string" &&
    String(isVariant ? stockDeduction?.gaugeValue : existing?.stringing?.selectedGauge).trim()
      ? String(isVariant ? stockDeduction?.gaugeValue : existing?.stringing?.selectedGauge).trim()
      : null;
  const stringId = String(existing?.stringing?.stringId ?? "");
  const productId = ObjectId.isValid(stringId) ? new ObjectId(stringId) : null;

  if (isVariant && !existing?.stockRestore?.variantStockRestoredAt) {
    if (!productId || !selectedColor || !selectedGauge) {
      throw new RentalCancelFinalizationError(
        "VARIANT_STOCK_RESTORE_FAILED",
        "대여 취소 중 옵션 조합 재고 정보를 확인할 수 없습니다.",
      );
    }
    const result = await db.collection("products").updateOne(
      {
        _id: productId,
        sold: { $gte: 1 },
        variantInventories: {
          $elemMatch: { colorValue: selectedColor, gaugeValue: selectedGauge },
        },
      },
      {
        $inc: {
          "variantInventories.$[variant].stock": 1,
          "colorInventories.$[color].stock": 1,
          "gaugeInventories.$[gauge].stock": 1,
          "inventory.stock": 1,
          sold: -1,
        },
      },
      {
        session,
        arrayFilters: [
          { "variant.colorValue": selectedColor, "variant.gaugeValue": selectedGauge },
          { "color.value": selectedColor },
          { "gauge.value": selectedGauge },
        ],
      },
    );
    if (!result.matchedCount || !result.modifiedCount) {
      throw new RentalCancelFinalizationError(
        "VARIANT_STOCK_RESTORE_FAILED",
        "대여 취소 중 옵션 조합 재고 복구에 실패했습니다.",
      );
    }
    return {
      "stockRestore.variantStockRestoredAt": now,
      "stockRestore.variantStockRestoreReason": "rental_cancel_approved",
    };
  }

  const fields: Record<string, unknown> = {};
  if (!isVariant && selectedGauge && productId) {
    const result = await db.collection("products").updateOne(
      { _id: productId, sold: { $gte: 1 }, "gaugeInventories.value": selectedGauge },
      { $inc: { "gaugeInventories.$.stock": 1, "inventory.stock": 1, sold: -1 } },
      { session },
    );
    if (!result.matchedCount || !result.modifiedCount) {
      throw new RentalCancelFinalizationError(
        "GAUGE_STOCK_RESTORE_FAILED",
        "스트링 게이지(굵기) 재고 복구에 실패했습니다.",
      );
    }
  }
  if (!isVariant && selectedColor && productId && !existing?.stringing?.colorStockRestoredAt) {
    const managed = await db.collection("products").countDocuments(
      { _id: productId, colorInventories: { $exists: true, $ne: [] } },
      { limit: 1, session },
    );
    if (managed > 0) {
      const result = await db.collection("products").updateOne(
        selectedGauge
          ? { _id: productId, "colorInventories.value": selectedColor }
          : { _id: productId, sold: { $gte: 1 }, "colorInventories.value": selectedColor },
        selectedGauge
          ? { $inc: { "colorInventories.$.stock": 1 } }
          : { $inc: { "colorInventories.$.stock": 1, "inventory.stock": 1, sold: -1 } },
        { session },
      );
      if (!result.matchedCount || !result.modifiedCount) {
        throw new RentalCancelFinalizationError(
          "COLOR_STOCK_RESTORE_FAILED",
          "대여 취소 중 색상 재고 복구에 실패했습니다.",
        );
      }
      fields["stringing.colorStockRestoredAt"] = now;
    }
  }
  return fields;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id))
      return NextResponse.json(
        { ok: false, message: "유효하지 않은 대여 ID입니다." },
        { status: 400 },
      );

    const rentals = guard.db.collection("rental_orders");
    const _id = new ObjectId(id);
    let existing: any = await rentals.findOne({ _id });
    if (!existing)
      return NextResponse.json({ ok: false, message: "대여를 찾을 수 없습니다." }, { status: 404 });

    const currentStatus = String(existing.status ?? "pending");
    const cancel = existing.cancelRequest;
    if (!cancel)
      return NextResponse.json(
        { ok: false, message: "INVALID_STATE", detail: "승인할 취소 요청이 없습니다." },
        { status: 409 },
      );
    const cancelStatus = String(cancel.status ?? "");
    if (currentStatus === "canceled" && cancelStatus === "approved") {
      return NextResponse.json({ ok: true });
    }
    if (cancelStatus !== "requested" && cancelStatus !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          message: "INVALID_STATE",
          detail: "승인 가능한 취소 요청 상태가 아닙니다.",
        },
        { status: 409 },
      );
    }

    const normalizedProvider = String(existing.paymentInfo?.provider ?? "").trim().toLowerCase();
    const tid = String(existing.paymentInfo?.tid ?? "").trim();
    if (normalizedProvider === "nicepay" && !isNiceCancelConfirmed(existing)) {
      if (!tid) {
        return NextResponse.json(
          { ok: false, errorCode: "NICE_TID_REQUIRED", message: "NICE 취소에 필요한 TID가 없습니다." },
          { status: 400 },
        );
      }
      const clientKey = String(
        process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "",
      ).trim();
      const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();
      if (!clientKey || !secretKey) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "NICE_CANCEL_CONFIG_MISSING",
            message: "NICE 취소 설정이 누락되어 취소를 진행할 수 없습니다.",
          },
          { status: 502 },
        );
      }

      const claimToken = randomUUID();
      const claimedAt = new Date();
      const claimResult: any = await rentals.findOneAndUpdate(
        {
          _id,
          "cancelRequest.status": { $in: ["requested", "approved"] },
          "cancelRequest.pgCancelClaim.status": { $ne: "processing" },
          $or: [
            { paymentStatus: { $ne: "결제취소" } },
            { "paymentInfo.niceSync.pgStatus": { $nin: ["canceled", "cancelled"] } },
          ],
        },
        {
          $set: {
            "cancelRequest.pgCancelClaim.status": "processing",
            "cancelRequest.pgCancelClaim.token": claimToken,
            "cancelRequest.pgCancelClaim.claimedAt": claimedAt,
            "cancelRequest.pgCancelClaim.updatedAt": claimedAt,
          },
        },
        { returnDocument: "after" },
      );
      const claimed = claimResult && "value" in claimResult ? claimResult.value : claimResult;
      if (!claimed) {
        const latest: any = await rentals.findOne({ _id });
        if (latest?.cancelRequest?.status === "rejected") {
          return NextResponse.json(
            {
              ok: false,
              errorCode: "RENTAL_CANCEL_REQUEST_STATE_CHANGED",
              message: "취소 요청 상태가 변경되어 승인할 수 없습니다.",
            },
            { status: 409 },
          );
        }
        if (latest?.cancelRequest?.pgCancelClaim?.status === "processing") {
          return NextResponse.json(
            {
              ok: false,
              errorCode: "RENTAL_CANCEL_ALREADY_PROCESSING",
              message: "다른 관리자가 NICE 결제 취소를 처리 중입니다.",
            },
            { status: 409 },
          );
        }
        if (isNiceCancelConfirmed(latest)) {
          existing = latest;
        } else {
          return NextResponse.json(
            {
              ok: false,
              errorCode: "RENTAL_CANCEL_CLAIM_CONFLICT",
              message: "최신 대여 상태가 NICE 취소 승인 조건과 일치하지 않습니다.",
            },
            { status: 409 },
          );
        }
      } else {
        existing = claimed;
        let cancelCalled = false;
        let cancelOrderId: string | null = null;
        let pgStatus = "";
        let pgBalanceAmount = 0;
        let cancelAmount = 0;
        const originalOrderId = String(existing.paymentInfo?.rawSummary?.orderId ?? "").trim();
        const handleUnsettledAmountShortage = async (resultMsg: string) => {
          const blockedAt = new Date();
          await rentals.updateOne(
            { _id, "cancelRequest.pgCancelClaim.token": claimToken },
            {
              $set: {
                "cancelRequest.pgCancelClaim.status": "failed",
                "cancelRequest.pgCancelClaim.updatedAt": blockedAt,
                "cancelRequest.pgCancelBlocked": {
                  reason: "unsettled_amount_shortage",
                  resultCode: "2026",
                  resultMsg: resultMsg || null,
                  tid,
                  amount: cancelAmount,
                  blockedAt,
                },
                "paymentInfo.niceSync": {
                  ...(existing.paymentInfo?.niceSync ?? {}),
                  lastSyncedAt: blockedAt.toISOString(),
                  source: "admin_rental_cancel_approve_failed",
                  pgStatus,
                  resultCode: "2026",
                  resultMsg: resultMsg || null,
                  cancelAmount,
                  originalOrderId,
                  cancelOrderId,
                  manualActionRequired: true,
                  manualActionReason: "unsettled_amount_shortage",
                },
              },
            },
          );
          return NextResponse.json(
            {
              ok: false,
              errorCode: "NICE_UNSETTLED_AMOUNT_SHORTAGE",
              message: "NICE 미정산금액 부족으로 자동 카드취소가 불가합니다.",
              adminGuide: {
                title: "NICE 자동 카드취소 불가",
                description:
                  "가맹점 미정산금액이 취소금액보다 부족합니다. NICE 입금 후 취소 절차를 진행하고 PG 상태를 다시 확인해 주세요.",
                nextActions: [
                  "NICE 미정산금액 입금 후 취소 절차를 진행해 주세요.",
                  "NICE에서 취소가 완료되면 관리자 대여 상세에서 다시 승인해 주세요.",
                ],
                diagnostics: {
                  originalOrderId,
                  cancelOrderId,
                  cancelAmount,
                  pgBalanceAmount,
                  pgStatus,
                  tid,
                  resultCode: "2026",
                  resultMsg: resultMsg || null,
                },
              },
            },
            { status: 409 },
          );
        };

        try {
          const pgRaw = await getNicePaymentByTid({ tid, clientKey, secretKey });
          const lookupCode = String(pgRaw.resultCode ?? pgRaw.ResultCode ?? "").trim();
          if (lookupCode && lookupCode !== "0000") {
            throw Object.assign(new Error(String(pgRaw.resultMsg ?? "NICE 상태 조회 실패")), {
              beforeCancel: true,
            });
          }
          pgStatus = normalizeNiceStatus(pgRaw.status ?? pgRaw.Status);
          pgBalanceAmount = Math.floor(Number(pgRaw.balanceAmt ?? 0));
          const localAmount = Math.floor(Number(existing.paymentInfo?.total ?? 0));
          let successRaw = pgRaw;
          let resultCode = lookupCode || "0000";
          let resultMsg = String(pgRaw.resultMsg ?? pgRaw.ResultMsg ?? "").trim();
          cancelAmount = Math.max(0, Math.floor(Number(pgRaw.cancAmt ?? pgRaw.cancelAmount ?? 0)));

          if (pgStatus !== "canceled") {
            if (pgStatus !== "paid" && pgStatus !== "partialcanceled") {
              throw Object.assign(new Error("NICE 결제 상태가 취소 가능한 상태가 아닙니다."), {
                beforeCancel: true,
              });
            }
            cancelAmount = pgBalanceAmount > 0 ? pgBalanceAmount : pgStatus === "paid" ? localAmount : 0;
            if (!Number.isFinite(cancelAmount) || cancelAmount <= 0) {
              throw Object.assign(new Error("NICE 취소 금액을 확인할 수 없습니다."), {
                beforeCancel: true,
              });
            }
            cancelOrderId = createNiceCancelOrderId(_id);
            cancelCalled = true;
            successRaw = await cancelNicePaymentByTid({
              tid,
              orderId: cancelOrderId,
              cancelAmt: cancelAmount,
              reason: "관리자 대여 취소 승인 처리",
              clientKey,
              secretKey,
            });
            resultCode = String(successRaw.resultCode ?? successRaw.ResultCode ?? "").trim();
            resultMsg = String(successRaw.resultMsg ?? successRaw.ResultMsg ?? "").trim();
            if (resultCode === "2026") return handleUnsettledAmountShortage(resultMsg);
            if (!new Set(["0000", "2001", "2211"]).has(resultCode)) {
              await rentals.updateOne(
                { _id, "cancelRequest.pgCancelClaim.token": claimToken },
                {
                  $set: {
                    "cancelRequest.pgCancelClaim.status": "failed",
                    "cancelRequest.pgCancelClaim.updatedAt": new Date(),
                  },
                },
              );
              return NextResponse.json(
                {
                  ok: false,
                  errorCode: "NICE_CANCEL_FAILED",
                  message: resultMsg || "NICE 결제 취소가 완료되지 않았습니다.",
                },
                { status: 400 },
              );
            }
          }

          const persistedAt = new Date();
          const canceledAt =
            String(successRaw.canceledAt ?? successRaw.cancelledAt ?? successRaw.cancelDate ?? "").trim() ||
            persistedAt.toISOString();
          const persisted = await rentals.updateOne(
            { _id, "cancelRequest.pgCancelClaim.token": claimToken },
            {
              $set: {
                paymentStatus: "결제취소",
                "paymentInfo.status": "canceled",
                "paymentInfo.niceSync": {
                  ...(existing.paymentInfo?.niceSync ?? {}),
                  lastSyncedAt: persistedAt.toISOString(),
                  source:
                    pgStatus === "canceled"
                      ? "admin_rental_cancel_approve_pg_lookup"
                      : "admin_rental_cancel_approve",
                  pgStatus: "canceled",
                  manualActionRequired: false,
                  manualActionReason: null,
                  resultCode: resultCode || "0000",
                  resultMsg: resultMsg || null,
                  canceledAt,
                  cancelAmount,
                  originalOrderId,
                  cancelOrderId,
                },
                "cancelRequest.pgCancelClaim.status": "pg_canceled",
                "cancelRequest.pgCancelClaim.updatedAt": persistedAt,
              },
              $unset: { "cancelRequest.pgCancelBlocked": "" },
            },
          );
          if (!persisted.modifiedCount) {
            throw Object.assign(new Error("PG 취소 성공 상태를 대여에 저장하지 못했습니다."), {
              afterCancel: true,
            });
          }
          existing = await rentals.findOne({ _id });
        } catch (error: any) {
          if (String(error?.resultCode ?? "").trim() === "2026") {
            return handleUnsettledAmountShortage(
              String(error?.resultMsg ?? error?.message ?? "").trim(),
            );
          }
          const reconciliation = cancelCalled || error?.afterCancel;
          await rentals.updateOne(
            { _id, "cancelRequest.pgCancelClaim.token": claimToken },
            {
              $set: {
                "cancelRequest.pgCancelClaim.status": reconciliation
                  ? "needs_reconciliation"
                  : "failed",
                "cancelRequest.pgCancelClaim.updatedAt": new Date(),
              },
            },
          );
          return NextResponse.json(
            {
              ok: false,
              errorCode: reconciliation
                ? "NICE_CANCEL_NEEDS_RECONCILIATION"
                : "NICE_CANCEL_FAILED",
              message: reconciliation
                ? "NICE 취소 결과 확인이 필요합니다. 다시 시도하면 PG 상태를 먼저 확인합니다."
                : String(error?.message || "NICE 결제 취소 중 오류가 발생했습니다."),
            },
            { status: reconciliation ? 502 : 400 },
          );
        }
      }
    }

    const client = await clientPromise;
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const current: any = await rentals.findOne({ _id }, { session });
        if (!current)
          throw new RentalCancelFinalizationError("RENTAL_NOT_FOUND", "대여를 찾을 수 없습니다.");
        if (current.status === "canceled" && current.cancelRequest?.status === "approved") return;
        if (!["requested", "approved"].includes(String(current.cancelRequest?.status ?? ""))) {
          throw new RentalCancelFinalizationError(
            "RENTAL_CANCEL_REQUEST_STATE_CHANGED",
            "취소 요청 상태가 변경되어 승인할 수 없습니다.",
          );
        }
        if (normalizedProvider === "nicepay" && !isNiceCancelConfirmed(current)) {
          throw new RentalCancelFinalizationError(
            "PG_CANCEL_NOT_CONFIRMED",
            "PG 결제 취소가 확인되지 않아 후처리할 수 없습니다.",
          );
        }
        const currentNormalizedProvider = String(current.paymentInfo?.provider ?? "")
          .trim()
          .toLowerCase();
        const niceCancelConfirmed =
          currentNormalizedProvider === "nicepay" && isNiceCancelConfirmed(current);

        const finalizedAt = new Date();
        const stockFields = await restoreRentalStock(guard.db, current, finalizedAt, session);
        const uid = String(current.userId ?? "");
        if (ObjectId.isValid(uid)) {
          const rentalId = String(current._id);
          const txCol = guard.db.collection("points_transactions");
          const spend: any = await txCol.findOne(
            { refKey: `rental:${rentalId}:spend`, status: "confirmed" },
            { session },
          );
          const amount = Math.max(
            0,
            Math.trunc(Math.abs(Number(spend?.amount ?? 0)) || Number(current.pointsUsed ?? 0)),
          );
          if (amount > 0) {
            await grantPoints(
              guard.db,
              {
                userId: new ObjectId(uid),
                amount,
                type: "reversal",
                status: "confirmed",
                refKey: `rental:${rentalId}:spend_reversal`,
                reason: `대여 취소로 사용 포인트 복원 (대여ID: ${rentalId})`,
              },
              { session },
            );
          }
        }

        const links: Record<string, unknown>[] = [
          { rentalId: current._id },
          { rentalId: id },
          { paymentSource: `rental:${id}` },
        ];
        const applicationId = String(current.stringingApplicationId ?? "");
        if (ObjectId.isValid(applicationId)) links.unshift({ _id: new ObjectId(applicationId) });
        const applications = guard.db.collection("stringing_applications");
        const linkedApps = await applications.find({ $or: links }, { session }).toArray();
        for (const app of linkedApps) {
          if (app.status === "취소") continue;
          await applications.updateOne(
            { _id: app._id },
            {
              $set: { status: "취소", updatedAt: finalizedAt },
              $push: {
                history: {
                  status: "취소",
                  date: finalizedAt,
                  description: "대여 취소 승인에 따라 신청도 함께 취소되었습니다.",
                },
              },
            } as any,
            { session },
          );
        }

        if (current.racketId && ObjectId.isValid(String(current.racketId))) {
          const racketId = new ObjectId(String(current.racketId));
          const racket: any = await guard.db
            .collection("used_rackets")
            .findOne({ _id: racketId }, { projection: { quantity: 1 }, session });
          const quantity = Number(racket?.quantity ?? 1);
          if (!Number.isFinite(quantity) || quantity <= 1) {
            await guard.db.collection("used_rackets").updateOne(
              { _id: racketId, status: "rented" },
              { $set: { status: "available", updatedAt: finalizedAt } },
              { session },
            );
          }
        }

        await rentals.updateOne(
          { _id },
          {
            $set: {
              ...stockFields,
              status: "canceled",
              "cancelRequest.status": "approved",
              "cancelRequest.processedAt": finalizedAt,
              ...(niceCancelConfirmed
                ? {
                    "paymentInfo.niceSync.manualActionRequired": false,
                    "paymentInfo.niceSync.manualActionReason": null,
                  }
                : {}),
              updatedAt: finalizedAt,
            },
            ...(niceCancelConfirmed
              ? { $unset: { "cancelRequest.pgCancelBlocked": "" } }
              : {}),
          } as any,
          { session },
        );
        await guard.db.collection("rental_history").insertOne(
          {
            rentalId: _id,
            action: "cancel-approved",
            from: current.status,
            to: "canceled",
            actor: { role: "admin", id: String(guard.admin._id) },
            snapshot: {
              cancelRequest: {
                ...(current.cancelRequest ?? {}),
                status: "approved",
                processedAt: finalizedAt,
              },
            },
            at: finalizedAt,
          },
          { session },
        );
      });
    } catch (error: any) {
      const code =
        error instanceof RentalCancelFinalizationError
          ? error.code
          : "RENTAL_CANCEL_FINALIZATION_FAILED";
      const latest: any = await rentals.findOne({ _id });
      const pgConfirmed = normalizedProvider === "nicepay" && isNiceCancelConfirmed(latest);
      const message =
        code === "PG_CANCEL_NOT_CONFIRMED"
          ? "PG 취소 상태가 확인되지 않아 대여 내부 취소 확정을 진행하지 않았습니다."
          : pgConfirmed
            ? "PG 결제 취소는 완료되었지만 대여 내부 후처리가 완료되지 않았습니다. 관리자 후처리를 다시 시도해 주세요."
            : "대여 취소 내부 후처리가 완료되지 않았습니다. 다시 시도해 주세요.";
      return NextResponse.json(
        { ok: false, errorCode: code, code, message, detail: error?.message || null },
        {
          status:
            code === "PG_CANCEL_NOT_CONFIRMED" ||
            code === "RENTAL_CANCEL_REQUEST_STATE_CHANGED" ||
            code.endsWith("STOCK_RESTORE_FAILED")
              ? 409
              : 500,
        },
      );
    } finally {
      await session.endSession();
    }

    await appendAdminAudit(
      guard.db,
      {
        type: "admin.rentals.status.cancel-approved",
        actorId: guard.admin._id,
        targetId: _id,
        message: "대여 취소 요청 승인 처리",
        diff: { from: currentStatus, to: "canceled", cancelRequestStatus: "approved" },
      },
      req,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/rentals/[id]/cancel-approve 오류:", error);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
