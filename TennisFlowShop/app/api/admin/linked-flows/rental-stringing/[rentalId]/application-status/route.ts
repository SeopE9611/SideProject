import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/application-status";

export const dynamic = "force-dynamic";

type StatusBody = {
  status?: unknown;
};

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus);
}

function toObjectId(value: unknown): ObjectId | null {
  const normalized = String(value ?? "").trim();
  return ObjectId.isValid(normalized) ? new ObjectId(normalized) : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ rentalId: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { rentalId } = await params;
  if (!ObjectId.isValid(rentalId)) {
    return NextResponse.json(
      { ok: false, message: "유효하지 않은 대여 ID입니다." },
      { status: 400 },
    );
  }

  let body: StatusBody;
  try {
    body = (await req.json()) as StatusBody;
  } catch {
    return NextResponse.json({ ok: false, message: "요청 본문을 확인해주세요." }, { status: 400 });
  }

  if (!isApplicationStatus(body.status)) {
    return NextResponse.json(
      { ok: false, message: "허용되지 않은 교체서비스 상태입니다." },
      { status: 400 },
    );
  }

  const rentalObjectId = new ObjectId(rentalId);
  const rentals = guard.db.collection("rental_orders");
  const applications = guard.db.collection("stringing_applications");
  const rental = await rentals.findOne(
    { _id: rentalObjectId },
    { projection: { _id: 1, status: 1, stringingApplicationId: 1 } },
  );

  if (!rental) {
    return NextResponse.json(
      { ok: false, message: "대여 주문을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (String(rental.status ?? "").toLowerCase() !== "paid") {
    return NextResponse.json(
      {
        ok: false,
        message: "교체서비스 작업 상태는 결제완료 상태의 대여 상세에서만 변경할 수 있습니다.",
      },
      { status: 409 },
    );
  }

  const linkedApplicationObjectId = toObjectId(rental.stringingApplicationId);
  const linkConditions: Record<string, unknown>[] = [
    { rentalId: rentalObjectId },
    { rentalId },
    { paymentSource: `rental:${rentalId}` },
  ];
  if (linkedApplicationObjectId) {
    linkConditions.unshift({ _id: linkedApplicationObjectId });
  }

  const application = await applications.findOne(
    { $or: linkConditions },
    { sort: { updatedAt: -1, createdAt: -1 } },
  );
  if (!application) {
    return NextResponse.json(
      { ok: false, message: "연결된 교체서비스 신청서를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const applicationRentalId = String(application.rentalId ?? "").trim();
  const paymentSource = String(application.paymentSource ?? "").trim();
  const rentalApplicationId = String(rental.stringingApplicationId ?? "").trim();
  const applicationId = String(application._id);
  const isLinked =
    applicationRentalId === rentalId ||
    paymentSource === `rental:${rentalId}` ||
    rentalApplicationId === applicationId;

  if (!isLinked) {
    return NextResponse.json(
      { ok: false, message: "현재 대여와 연결되지 않은 신청서입니다." },
      { status: 403 },
    );
  }

  const previousStatus = String(application.status ?? "").trim();
  const cancelRequestStatus = String(application?.cancelRequest?.status ?? "").trim();
  if (
    !isApplicationStatus(previousStatus) ||
    cancelRequestStatus === "requested" ||
    cancelRequestStatus === "approved"
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "취소 상태이거나 취소 요청 처리 중인 신청서는 기존 취소 처리 경로에서 관리해주세요.",
      },
      { status: 409 },
    );
  }

  const nextStatus = body.status;
  if (previousStatus === nextStatus) {
    return NextResponse.json({
      ok: true,
      noop: true,
      applicationId,
      status: nextStatus,
      rentalStatus: rental.status,
    });
  }

  const now = new Date();
  const update = await applications.updateOne(
    { _id: application._id, status: application.status },
    {
      $set: { status: nextStatus, updatedAt: now },
      $unset: { expireAt: "" },
      $push: {
        history: {
          status: nextStatus,
          date: now,
          description: `[관리자 대여 상세 처리] ${previousStatus || "상태 없음"} → ${nextStatus}`,
        },
      },
    } as any,
  );

  if (!update.matchedCount) {
    return NextResponse.json(
      {
        ok: false,
        message: "신청서 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    applicationId,
    previousStatus,
    status: nextStatus,
    rentalStatus: rental.status,
  });
}
