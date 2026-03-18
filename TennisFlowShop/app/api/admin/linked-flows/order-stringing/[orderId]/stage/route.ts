import {
  onScheduleConfirmed,
  onStatusUpdated,
} from "@/app/features/notifications/triggers/stringing";
import { issuePassesForPaidOrder } from "@/lib/passes.service";
import { NextResponse } from "next/server";
import { ClientSession, ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import clientPromise from "@/lib/mongodb";
import {
  buildLinkedFlowStagePreview,
  inferLinkedFlowStage,
  isApplicationClosedForLinkedAutomation,
  isLinkedFlowStage,
  LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES,
  LINKED_FLOW_STAGE_EXCLUDED_APPLICATION_STATUSES,
  LINKED_FLOW_STAGE_EXCLUDED_CANCEL_REQUEST_STATUSES,
  mapOrderStatusToPaymentStatus,
  mapStageToApplicationStatus,
  mapStageToOrderStatus,
} from "@/lib/admin/linked-flow-stage";

export const dynamic = "force-dynamic";

type StageBody = {
  stage?: unknown;
};

async function pickLatestLinkedApplication(
  collection: any,
  orderId: ObjectId,
  session?: ClientSession,
) {
  const rows = await collection
    .find(
      {
        orderId: { $in: [orderId, String(orderId)] },
        status: { $nin: [...LINKED_FLOW_STAGE_EXCLUDED_APPLICATION_STATUSES] },
        $or: [
          { "cancelRequest.status": { $exists: false } },
          {
            "cancelRequest.status": {
              $nin: [...LINKED_FLOW_STAGE_EXCLUDED_CANCEL_REQUEST_STATUSES],
            },
          },
        ],
      },
      {
        projection: {
          _id: 1,
          status: 1,
          updatedAt: 1,
          createdAt: 1,
          stringDetails: 1,
          orderId: 1,
          customer: 1,
          userSnapshot: 1,
          guestName: 1,
          guestEmail: 1,
          cancelRequest: 1,
        } as any,
        session,
      },
    )
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(1)
    .toArray();

  return rows[0] ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { orderId } = await params;
  if (!ObjectId.isValid(orderId)) {
    return NextResponse.json(
      { success: false, message: "INVALID_ORDER_ID" },
      { status: 400 },
    );
  }

  let body: StageBody | null = null;
  try {
    body = (await req.json()) as StageBody;
  } catch {
    return NextResponse.json(
      { success: false, message: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const rawStage = body?.stage;
  if (!isLinkedFlowStage(rawStage)) {
    return NextResponse.json(
      { success: false, message: "INVALID_STAGE" },
      { status: 400 },
    );
  }

  const _id = new ObjectId(orderId);
  const stage = rawStage;
  const now = new Date();

  const client = await clientPromise;
  const mongoSession = client.startSession();

  let resultPayload: any = null;

  try {
    await mongoSession.withTransaction(async () => {
      const orders = guard.db.collection("orders");
      const applications = guard.db.collection("stringing_applications");

      const order = await orders.findOne(
        { _id },
        {
          projection: {
            _id: 1,
            status: 1,
            paymentStatus: 1,
            updatedAt: 1,
          } as any,
          session: mongoSession,
        },
      );

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const previousOrderStatus = String((order as any).status ?? "").trim();
      if (
        LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES.includes(
          previousOrderStatus as any,
        )
      ) {
        throw new Error(`ORDER_STATUS_BLOCKED:${previousOrderStatus}`);
      }

      const app = await pickLatestLinkedApplication(
        applications,
        _id,
        mongoSession,
      );
      if (!app) {
        throw new Error("LINKED_APPLICATION_NOT_FOUND");
      }

      const previousApplicationStatus = String(
        (app as any).status ?? "",
      ).trim();
      if (
        isApplicationClosedForLinkedAutomation({
          status: previousApplicationStatus,
          cancelRequestStatus: (app as any)?.cancelRequest?.status,
        })
      ) {
        throw new Error("APPLICATION_STATUS_BLOCKED");
      }

      const nextOrderStatus = mapStageToOrderStatus(stage);
      const nextApplicationStatus = mapStageToApplicationStatus(stage);
      const nextPaymentStatus = mapOrderStatusToPaymentStatus(nextOrderStatus);
      const currentInferred = inferLinkedFlowStage(
        previousOrderStatus,
        previousApplicationStatus,
      );

      if (
        currentInferred === stage &&
        previousOrderStatus === nextOrderStatus &&
        previousApplicationStatus === nextApplicationStatus
      ) {
        resultPayload = {
          stage,
          now,
          becamePaid: false,
          noop: true,
          message: "변경 사항이 없습니다.",
          orderId: String((order as any)._id),
          appId: String((app as any)._id),
          previousOrderStatus,
          nextOrderStatus,
          previousApplicationStatus,
          nextApplicationStatus,
          previewText: buildLinkedFlowStagePreview({
            stage,
            orderPreviousStatus: previousOrderStatus,
            orderNextStatus: nextOrderStatus,
            applicationPreviousStatus: previousApplicationStatus,
            applicationNextStatus: nextApplicationStatus,
          }),
        };
        return;
      }

      const orderHistoryEntry = {
        status: nextOrderStatus,
        date: now,
        description: `[관리자 대표단계 변경] ${currentInferred ? `${currentInferred} → ` : ""}${stage} (연결 신청서 동기화)`,
      };

      const applicationHistoryEntry = {
        status: nextApplicationStatus,
        date: now,
        description: `[관리자 대표단계 변경] ${currentInferred ? `${currentInferred} → ` : ""}${stage} (연결 주문 동기화)`,
      };

      const orderSetFields: Record<string, any> = {
        status: nextOrderStatus,
        updatedAt: now,
      };
      if (nextPaymentStatus) orderSetFields.paymentStatus = nextPaymentStatus;

      const orderUpdateRes = await orders.updateOne(
        { _id },
        {
          $set: orderSetFields,
          $push: { history: orderHistoryEntry },
        } as any,
        { session: mongoSession },
      );

      if (!orderUpdateRes.matchedCount) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const appUpdateOps: Record<string, any> = {
        $set: { status: nextApplicationStatus, updatedAt: now },
        $push: { history: applicationHistoryEntry },
      };
      if (nextApplicationStatus !== "draft") {
        appUpdateOps.$unset = { expireAt: "" };
      }

      const appUpdateRes = await applications.updateOne(
        { _id: (app as any)._id },
        appUpdateOps as any,
        { session: mongoSession },
      );

      if (!appUpdateRes.matchedCount) {
        throw new Error("LINKED_APPLICATION_NOT_FOUND");
      }

      const becamePaid =
        (order as any).paymentStatus !== "결제완료" &&
        nextPaymentStatus === "결제완료";

      resultPayload = {
        stage,
        now,
        becamePaid,
        orderId: String((order as any)._id),
        appId: String((app as any)._id),
        previousOrderStatus,
        nextOrderStatus,
        previousApplicationStatus,
        nextApplicationStatus,
        previewText: buildLinkedFlowStagePreview({
          stage,
          orderPreviousStatus: previousOrderStatus,
          orderNextStatus: nextOrderStatus,
          applicationPreviousStatus: previousApplicationStatus,
          applicationNextStatus: nextApplicationStatus,
        }),
      };
    });
  } catch (e: any) {
    const message = String(e?.message ?? "");
    if (message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "ORDER_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (message === "LINKED_APPLICATION_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "진행중인 연결 신청서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (message.startsWith("ORDER_STATUS_BLOCKED:")) {
      const orderStatus = message.split(":")[1] || "";
      return NextResponse.json(
        {
          success: false,
          message: "주문이 종료 상태이므로 대표 단계를 변경할 수 없습니다.",
          orderStatus,
          blockedStatuses: LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES,
        },
        { status: 400 },
      );
    }
    if (message === "APPLICATION_STATUS_BLOCKED") {
      return NextResponse.json(
        {
          success: false,
          message: "취소/종료된 신청서는 대표 단계 변경 대상이 아닙니다.",
        },
        { status: 400 },
      );
    }

    console.error("[admin linked-flow stage] transaction failed:", e);
    return NextResponse.json(
      {
        success: false,
        message:
          "대표 단계 변경 처리 중 오류가 발생했습니다. 저장이 완료되지 않았습니다.",
      },
      { status: 500 },
    );
  } finally {
    await mongoSession.endSession();
  }

  try {
    if (!resultPayload?.noop && resultPayload?.becamePaid) {
      const updatedOrder = await guard.db
        .collection("orders")
        .findOne({ _id: new ObjectId(resultPayload.orderId) });
      if (updatedOrder) {
        await issuePassesForPaidOrder(guard.db, updatedOrder);
      }
    }

    const appDoc = resultPayload?.noop
      ? null
      : await guard.db
          .collection("stringing_applications")
          .findOne({ _id: new ObjectId(resultPayload.appId) });
    if (appDoc) {
      const userCtx = {
        name:
          appDoc?.customer?.name ??
          appDoc?.userSnapshot?.name ??
          appDoc?.guestName ??
          undefined,
        email:
          appDoc?.customer?.email ??
          appDoc?.userSnapshot?.email ??
          appDoc?.guestEmail,
      };

      const appCtx = {
        applicationId: String(appDoc._id),
        orderId: appDoc?.orderId ? String(appDoc.orderId) : null,
        status: resultPayload.nextApplicationStatus,
        stringDetails: appDoc?.stringDetails,
        shippingInfo: appDoc?.shippingInfo,
      };

      const adminDetailUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/admin/applications/stringing/${String(appDoc._id)}`;

      await onStatusUpdated({
        user: userCtx,
        application: appCtx,
        adminDetailUrl,
      });
      if (resultPayload.nextApplicationStatus === "접수완료") {
        const hasSchedule =
          Boolean(appDoc?.stringDetails?.preferredDate) &&
          Boolean(appDoc?.stringDetails?.preferredTime);
        if (hasSchedule) {
          await onScheduleConfirmed({ user: userCtx, application: appCtx });
        }
      }
    }
  } catch (sideEffectError) {
    console.error(
      "[admin linked-flow stage] post side-effect failed:",
      sideEffectError,
    );
  }

  return NextResponse.json({
    success: true,
    noop: Boolean(resultPayload.noop),
    message: resultPayload.message,
    stage: resultPayload.stage,
    order: {
      id: resultPayload.orderId,
      previousStatus: resultPayload.previousOrderStatus,
      nextStatus: resultPayload.nextOrderStatus,
      paymentStatus: mapOrderStatusToPaymentStatus(
        resultPayload.nextOrderStatus,
      ),
    },
    application: {
      id: resultPayload.appId,
      previousStatus: resultPayload.previousApplicationStatus,
      nextStatus: resultPayload.nextApplicationStatus,
    },
    previewText: resultPayload.previewText,
  });
}
