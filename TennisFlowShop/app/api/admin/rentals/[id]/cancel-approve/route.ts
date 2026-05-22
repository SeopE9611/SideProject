import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { writeRentalHistory } from "@/app/features/rentals/utils/history";
import { grantPoints } from "@/lib/points.service";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const existing: any = await rentals.findOne({ _id });
    if (!existing)
      return NextResponse.json(
        { ok: false, message: "대여를 찾을 수 없습니다." },
        { status: 404 },
      );

    const currentStatus = String(existing.status ?? "pending");
    const cancel = existing.cancelRequest;
    if (!cancel)
      return NextResponse.json(
        {
          ok: false,
          message: "INVALID_STATE",
          detail: "승인할 취소 요청이 없습니다.",
        },
        { status: 409 },
      );

    const cancelStatus = String(cancel.status ?? "");
    const isRequested = cancelStatus === "requested";
    const isApproved = cancelStatus === "approved";
    if (!isRequested && !isApproved) {
      return NextResponse.json(
        {
          ok: false,
          message: "INVALID_STATE",
          detail: "승인 가능한 취소 요청 상태가 아닙니다.",
        },
        { status: 409 },
      );
    }

    const alreadyCanceledApproved = currentStatus === "canceled" && isApproved;
    const now = new Date();

    const selectedGauge =
      typeof existing?.stringing?.selectedGauge === "string" &&
      existing.stringing.selectedGauge.trim()
        ? existing.stringing.selectedGauge.trim()
        : null;
    const selectedColor =
      typeof existing?.stringing?.selectedColor === "string" &&
      existing.stringing.selectedColor.trim()
        ? existing.stringing.selectedColor.trim()
        : null;
    const colorStockRestoredAt = existing?.stringing?.colorStockRestoredAt ? new Date(existing.stringing.colorStockRestoredAt) : null;

    const stringProductId =
      existing?.stringing?.stringId && ObjectId.isValid(String(existing.stringing.stringId))
        ? new ObjectId(String(existing.stringing.stringId))
        : null;

    if (!alreadyCanceledApproved && selectedGauge && stringProductId) {
      const gaugeRestoreResult = await guard.db.collection("products").updateOne(
        {
          _id: stringProductId,
          sold: { $gte: 1 },
          "gaugeInventories.value": selectedGauge,
        },
        {
          $inc: {
            "gaugeInventories.$.stock": 1,
            "inventory.stock": 1,
            sold: -1,
          },
        },
      );

      if (gaugeRestoreResult.matchedCount < 1 || gaugeRestoreResult.modifiedCount < 1) {
        return NextResponse.json(
          { ok: false, message: "스트링 게이지 재고 복구에 실패했습니다." },
          { status: 409 },
        );
      }
    }


    if (!alreadyCanceledApproved && selectedColor && stringProductId && !colorStockRestoredAt) {
      const hasManagedColorInventories = await guard.db.collection("products").countDocuments(
        { _id: stringProductId, colorInventories: { $exists: true, $ne: [] } },
        { limit: 1 },
      );

      if (hasManagedColorInventories > 0) {
        const colorRestoreResult = await guard.db.collection("products").updateOne(
          selectedGauge
            ? { _id: stringProductId, "colorInventories.value": selectedColor }
            : { _id: stringProductId, sold: { $gte: 1 }, "colorInventories.value": selectedColor },
          selectedGauge
            ? { $inc: { "colorInventories.$.stock": 1 } }
            : { $inc: { "colorInventories.$.stock": 1, "inventory.stock": 1, sold: -1 } },
        );

        if (colorRestoreResult.matchedCount < 1 || colorRestoreResult.modifiedCount < 1) {
          return NextResponse.json(
            { ok: false, code: "COLOR_STOCK_RESTORE_FAILED", message: "대여 취소 중 색상 재고 복구에 실패했습니다." },
            { status: 409 },
          );
        }

        await rentals.updateOne(
          { _id, "stringing.colorStockRestoredAt": { $exists: false } },
          { $set: { "stringing.colorStockRestoredAt": now, updatedAt: now } },
        );
      }
    }

    if (!alreadyCanceledApproved) {
      await rentals.updateOne({ _id }, {
        $set: {
          status: "canceled",
          "cancelRequest.status": "approved",
          "cancelRequest.processedAt": now,
          updatedAt: now,
        },
      } as any);

      await writeRentalHistory(guard.db, _id, {
        action: "cancel-approved",
        from: currentStatus,
        to: "canceled",
        actor: { role: "admin", id: String(guard.admin._id) },
        snapshot: {
          cancelRequest: {
            ...(cancel || {}),
            status: "approved",
            processedAt: now,
          },
        },
      });
    }

    try {
      const uidStr = existing.userId ? String(existing.userId) : "";
      if (ObjectId.isValid(uidStr)) {
        const userOid = new ObjectId(uidStr);
        const rentalObjectId = String(existing._id);
        const txCol = guard.db.collection("points_transactions");
        const spendTx: any = await txCol.findOne({
          refKey: `rental:${rentalObjectId}:spend`,
          status: "confirmed",
        });
        const amountFromTx = Math.abs(Number(spendTx?.amount ?? 0));
        const amountFromRental = Number(existing.pointsUsed ?? 0);
        const amountToRestore = Math.max(
          0,
          Math.trunc(amountFromTx || amountFromRental || 0),
        );

        if (amountToRestore > 0) {
          await grantPoints(guard.db, {
            userId: userOid,
            amount: amountToRestore,
            type: "reversal",
            status: "confirmed",
            refKey: `rental:${rentalObjectId}:spend_reversal`,
            reason: `대여 취소로 사용 포인트 복원 (대여ID: ${rentalObjectId})`,
          });
        }
      }
    } catch (e) {
      console.error("[admin/rentals/cancel-approve] points restore error:", e);
    }

    if (existing?.racketId) {
      const racketIdStr = String(existing.racketId);
      if (ObjectId.isValid(racketIdStr)) {
        const rid = new ObjectId(racketIdStr);
        const rack = await guard.db
          .collection("used_rackets")
          .findOne({ _id: rid }, { projection: { quantity: 1 } });
        const qty = Number(rack?.quantity ?? 1);
        if (!Number.isFinite(qty) || qty <= 1) {
          await guard.db
            .collection("used_rackets")
            .updateOne(
              { _id: rid, status: "rented" },
              { $set: { status: "available", updatedAt: new Date() } },
            );
        }
      }
    }

    await appendAdminAudit(
      guard.db,
      {
        type: "admin.rentals.status.cancel-approved",
        actorId: guard.admin._id,
        targetId: _id,
        message: "대여 취소 요청 승인 처리",
        diff: {
          from: currentStatus,
          to: "canceled",
          cancelRequestStatus: "approved",
          alreadyCanceledApproved,
        },
      },
      req,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/rentals/[id]/cancel-approve 오류:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
