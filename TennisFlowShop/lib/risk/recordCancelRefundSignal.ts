import type { Db, ObjectId } from 'mongodb';

export type CancelRefundEventType =
  | 'order_cancel_request_created'
  | 'order_cancel_request_withdrawn'
  | 'order_cancel_request_rejected'
  | 'order_cancel_request_approved'
  | 'stringing_cancel_request_created'
  | 'stringing_cancel_request_rejected'
  | 'stringing_cancel_request_approved';

type SubjectType = 'user' | 'guest_order' | 'guest_application';
type TargetType = 'order' | 'stringing_application';
type ActorRole = 'user' | 'admin';

export type CancelRefundRiskSignalInput = {
  eventType: CancelRefundEventType;
  subjectKey: string;
  subjectType: SubjectType;
  targetType: TargetType;
  targetId: ObjectId | string;
  actorRole: ActorRole;
  reasonCode?: string | null;
  status?: string | null;
};

export function buildCancelRefundSubject(params: {
  userId?: ObjectId | string | null;
  orderId?: ObjectId | string | null;
  applicationId?: ObjectId | string | null;
}): { subjectKey: string; subjectType: SubjectType } {
  if (params.userId) {
    return {
      subjectKey: `user:${String(params.userId)}`,
      subjectType: 'user',
    };
  }

  if (params.applicationId) {
    return {
      subjectKey: `guest_application:${String(params.applicationId)}`,
      subjectType: 'guest_application',
    };
  }

  return {
    subjectKey: `guest_order:${String(params.orderId ?? '')}`,
    subjectType: 'guest_order',
  };
}

/**
 * 취소/환불 리스크 시그널 적재.
 * 실패해도 본 처리 플로우를 절대 막지 않기 위해 내부에서 예외를 삼킨다.
 */
export async function recordCancelRefundSignal(
  db: Db,
  input: CancelRefundRiskSignalInput,
) {
  try {
    const now = new Date();

    await db.collection('cancel_refund_risk_signals').updateOne(
      {
        category: 'cancel_refund',
        subjectKey: input.subjectKey,
        eventType: input.eventType,
      },
      {
        $setOnInsert: {
          category: 'cancel_refund',
          eventType: input.eventType,
          subjectKey: input.subjectKey,
          subjectType: input.subjectType,
          targetType: input.targetType,
          targetId: input.targetId,
          count: 0,
          firstAt: now,
          createdAt: now,
        },
        $set: {
          subjectType: input.subjectType,
          targetType: input.targetType,
          targetId: input.targetId,
          lastAt: now,
          lastActorRole: input.actorRole,
          lastReasonCode: input.reasonCode ?? null,
          lastStatus: input.status ?? null,
          updatedAt: now,
        },
        $inc: { count: 1 },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error('[recordCancelRefundSignal] failed', error);
  }
}
