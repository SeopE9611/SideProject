import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import {
  buildLinkedFlowStagePreview,
  inferLinkedFlowStage,
  isLinkedFlowStage,
  LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES,
  mapStageToApplicationStatus,
  mapStageToOrderStatus,
} from '@/lib/admin/linked-flow-stage';

export const dynamic = 'force-dynamic';

type StageBody = {
  stage?: unknown;
};

function getOrderIdCandidates(orderId: ObjectId) {
  return [orderId, String(orderId)];
}

function pickLatestLinkedApplication(applications: any[]) {
  if (!applications.length) return null;

  const sorted = [...applications].sort((a, b) => {
    const aDate = new Date((a?.updatedAt ?? a?.createdAt ?? 0) as any).getTime();
    const bDate = new Date((b?.updatedAt ?? b?.createdAt ?? 0) as any).getTime();
    return bDate - aDate;
  });

  const nonDraft = sorted.find((doc) => String(doc?.status ?? '').trim() !== 'draft');
  return nonDraft ?? sorted[0] ?? null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { orderId } = await params;
  if (!ObjectId.isValid(orderId)) {
    return NextResponse.json({ success: false, message: 'INVALID_ORDER_ID' }, { status: 400 });
  }

  let body: StageBody | null = null;
  try {
    body = (await req.json()) as StageBody;
  } catch {
    return NextResponse.json({ success: false, message: 'INVALID_JSON' }, { status: 400 });
  }

  const rawStage = body?.stage;
  if (!isLinkedFlowStage(rawStage)) {
    return NextResponse.json({ success: false, message: 'INVALID_STAGE' }, { status: 400 });
  }

  const _id = new ObjectId(orderId);
  const order = await guard.db.collection('orders').findOne({ _id }, { projection: { _id: 1, status: 1, updatedAt: 1 } as any });

  if (!order) {
    return NextResponse.json({ success: false, message: 'ORDER_NOT_FOUND' }, { status: 404 });
  }

  const previousOrderStatus = String((order as any).status ?? '').trim();
  if (LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES.includes(previousOrderStatus as any)) {
    return NextResponse.json(
      {
        success: false,
        message: 'ORDER_STATUS_BLOCKED',
        orderStatus: previousOrderStatus,
        blockedStatuses: LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES,
      },
      { status: 400 },
    );
  }

  const applications = await guard.db
    .collection('stringing_applications')
    .find(
      {
        orderId: { $in: getOrderIdCandidates(_id) },
      },
      {
        projection: { _id: 1, status: 1, updatedAt: 1, createdAt: 1 } as any,
      },
    )
    .limit(20)
    .toArray();

  const app = pickLatestLinkedApplication(applications as any[]);

  if (!app) {
    return NextResponse.json({ success: false, message: 'LINKED_APPLICATION_NOT_FOUND' }, { status: 404 });
  }

  const previousApplicationStatus = String((app as any).status ?? '').trim();
  const stage = rawStage;

  const nextOrderStatus = mapStageToOrderStatus(stage);
  const nextApplicationStatus = mapStageToApplicationStatus(stage);

  const now = new Date();
  const currentInferred = inferLinkedFlowStage(previousOrderStatus, previousApplicationStatus);

  const orderHistoryEntry = {
    status: nextOrderStatus,
    date: now,
    description: `[관리자 대표단계 변경] ${currentInferred ? `${currentInferred} → ` : ''}${stage} (연결 신청서 동기화)`,
  };

  const applicationHistoryEntry = {
    status: nextApplicationStatus,
    date: now,
    description: `[관리자 대표단계 변경] ${currentInferred ? `${currentInferred} → ` : ''}${stage} (연결 주문 동기화)`,
  };

  await guard.db.collection('orders').updateOne(
    { _id },
    {
      $set: { status: nextOrderStatus, updatedAt: now },
      $push: { history: orderHistoryEntry },
    } as any,
  );

  await guard.db.collection('stringing_applications').updateOne(
    { _id: (app as any)._id },
    {
      $set: { status: nextApplicationStatus, updatedAt: now },
      $push: { history: applicationHistoryEntry },
    } as any,
  );

  const previewText = buildLinkedFlowStagePreview({
    stage,
    orderPreviousStatus: previousOrderStatus,
    orderNextStatus: nextOrderStatus,
    applicationPreviousStatus: previousApplicationStatus,
    applicationNextStatus: nextApplicationStatus,
  });

  return NextResponse.json({
    success: true,
    stage,
    order: {
      id: String((order as any)._id),
      previousStatus: previousOrderStatus,
      nextStatus: nextOrderStatus,
    },
    application: {
      id: String((app as any)._id),
      previousStatus: previousApplicationStatus,
      nextStatus: nextApplicationStatus,
    },
    previewText,
  });
}
