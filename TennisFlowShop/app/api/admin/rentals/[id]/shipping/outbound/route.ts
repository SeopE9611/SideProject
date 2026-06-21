import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { ObjectId } from "mongodb";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { writeRentalHistory } from "@/app/features/rentals/utils/history";
import { getLinkedRentalStringingStatus } from "@/lib/admin/rental-stringing-flow.server";
import { hasRentalStringingService, isRentalStringingComplete } from "@/lib/rental-stringing-flow";
import { findCourierCatalogItem, normalizeCourierCode } from "@/lib/shipping/courier-map";
import { normalizeTrackingNumber } from "@/lib/shipping/tracking-number";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 관리자 인증
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // 파라미터/바디 검증
  const { id } = await params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ ok: false, message: "BAD_ID" }, { status: 400 });
  const {
    courier = "",
    trackingNumber = "",
    shippedAt,
  } = await req.json().catch(() => ({}));
  const normalizedCourier = normalizeCourierCode(courier);
  const courierItem = findCourierCatalogItem(normalizedCourier);
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  if (!courierItem)
    return NextResponse.json(
      { ok: false, message: "INVALID_COURIER" },
      { status: 400 },
    );
  if (courierItem.code === "ems")
    return NextResponse.json(
      { ok: false, message: "EMS는 현재 운송장 등록을 지원하지 않습니다." },
      { status: 400 },
    );
  if (!normalizedTrackingNumber)
    return NextResponse.json(
      { ok: false, message: "MISSING_FIELDS" },
      { status: 400 },
    );
  if (normalizedTrackingNumber.length < 9 || normalizedTrackingNumber.length > 20)
    return NextResponse.json(
      { ok: false, message: "INVALID_TRACKING_NUMBER" },
      { status: 400 },
    );

  // 저장
  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const rental: any = await db.collection("rental_orders").findOne({ _id });
  if (!rental)
    return NextResponse.json(
      { ok: false, message: "NOT_FOUND" },
      { status: 404 },
    );

  const stringingStatus = await getLinkedRentalStringingStatus(db, rental, id);
  if (hasRentalStringingService(rental) || stringingStatus !== null) {
    if (!isRentalStringingComplete(stringingStatus)) {
      return NextResponse.json(
        {
          ok: false,
          code: "STRINGING_NOT_COMPLETED",
          message:
            "교체서비스가 완료된 뒤 출고 또는 대여 시작을 진행할 수 있습니다.",
        },
        { status: 409 },
      );
    }
  }

  const prevOutbound = rental?.shipping?.outbound ?? {};
  const prevCourier = normalizeCourierCode(prevOutbound?.courier);
  const prevTracking = normalizeTrackingNumber(prevOutbound?.trackingNumber);
  const prevShippedAt = prevOutbound?.shippedAt
    ? new Date(prevOutbound.shippedAt)
    : null;
  const hadOutbound = Boolean(
    prevCourier ||
    prevTracking ||
    (prevShippedAt && Number.isFinite(prevShippedAt.getTime())),
  );

  const currentStatus = String(rental?.status ?? "").trim();
  if (currentStatus !== "paid") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATE",
        message: "결제완료 상태에서만 출고 운송장을 등록할 수 있습니다.",
      },
      { status: 409 },
    );
  }

  const nextShippedAt = shippedAt ? new Date(shippedAt) : new Date();
  const updated = await db.collection("rental_orders").updateOne(
    { _id, status: "paid" },
    {
      $set: {
        "shipping.outbound": {
          courier: normalizedCourier,
          trackingNumber: normalizedTrackingNumber,
          shippedAt: nextShippedAt,
        },
        updatedAt: new Date(),
      },
    },
  );
  if (updated.matchedCount === 0) {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATE", message: "출고 운송장 등록 불가 상태" },
      { status: 409 },
    );
  }

  await appendAdminAudit(
    db,
    {
      type: "admin.rentals.shipping.outbound.post",
      actorId: guard.admin._id,
      targetId: _id,
      message: hadOutbound ? "출고 운송장 수정" : "출고 운송장 등록",
      diff: {
        outbound: {
          courier: normalizedCourier,
          trackingNumber: normalizedTrackingNumber,
          shippedAt: nextShippedAt,
        },
      },
    },
    req,
  );

  await writeRentalHistory(db, _id, {
    action: hadOutbound ? "outbound-shipping-updated" : "outbound-shipping-set",
    from: currentStatus,
    to: currentStatus,
    actor: { role: "admin", id: String(guard.admin._id) },
    snapshot: {
      outbound: {
        courier: normalizedCourier,
        trackingNumber: normalizedTrackingNumber,
        shippedAt: nextShippedAt,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
