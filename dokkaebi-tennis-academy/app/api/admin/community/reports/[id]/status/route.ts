import { NextRequest, NextResponse } from 'next/server';
import { ClientSession, Db, ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import type { CommunityReportDocument } from '@/lib/types/community-report';

type Action = 'resolve' | 'reject' | 'resolve_hide_target';

type ResolveHideTargetResult =
  | {
      ok: true;
      targetBeforeStatus?: string;
      targetAfterStatus?: string;
      commentsCountAdjusted: boolean;
    }
  | {
      ok: false;
      status: 409 | 422;
      error: 'target_not_found' | 'target_already_processed' | 'target_update_failed';
      targetBeforeStatus?: string;
      targetAfterStatus?: string;
    };

class TransactionBusinessError extends Error {
  constructor(public readonly response: NextResponse) {
    super('transaction_business_error');
  }
}

function supportsTransactions(db: Db) {
  const topology = db.client.topology?.description;
  if (!topology) return false;

  return [...topology.servers.values()].some((server) => {
    const type = server.type;
    return type === 'RSPrimary' || type === 'RSSecondary' || type === 'Mongos';
  });
}

async function resolveHideTarget(
  db: Db,
  report: CommunityReportDocument,
  session?: ClientSession,
): Promise<ResolveHideTargetResult> {
  const postsCol = db.collection('community_posts');
  const commentsCol = db.collection('community_comments');

  if (report.targetType === 'post' && report.postId) {
    // post 대상은 존재 여부와 현재 상태를 먼저 확인해, 이미 hidden/deleted인 중복 처리를 구분한다.
    const post = await postsCol.findOne({ _id: report.postId }, { projection: { status: 1 }, session });

    if (!post) {
      return { ok: false, status: 409, error: 'target_not_found' };
    }

    const beforeStatus = typeof post.status === 'string' ? post.status : 'public';
    if (beforeStatus === 'hidden' || beforeStatus === 'deleted') {
      return {
        ok: false,
        status: 409,
        error: 'target_already_processed',
        targetBeforeStatus: beforeStatus,
        targetAfterStatus: beforeStatus,
      };
    }

    const postUpdateResult = await postsCol.updateOne(
      { _id: report.postId, status: { $nin: ['hidden', 'deleted'] } },
      { $set: { status: 'hidden', updatedAt: new Date() } },
      { session },
    );

    if (postUpdateResult.matchedCount === 0) {
      return {
        ok: false,
        status: 409,
        error: 'target_already_processed',
        targetBeforeStatus: beforeStatus,
      };
    }

    if (postUpdateResult.modifiedCount !== 1) {
      return {
        ok: false,
        status: 422,
        error: 'target_update_failed',
        targetBeforeStatus: beforeStatus,
      };
    }

    return {
      ok: true,
      targetBeforeStatus: beforeStatus,
      targetAfterStatus: 'hidden',
      commentsCountAdjusted: false,
    };
  }

  if (report.targetType === 'comment' && report.commentId) {
    // comment 대상은 삭제 상태를 먼저 확인해, 이미 삭제된 댓글의 중복 처리에 대해 409를 반환한다.
    const comment = await commentsCol.findOne(
      { _id: report.commentId },
      { projection: { status: 1, postId: 1 }, session },
    );

    if (!comment) {
      return { ok: false, status: 409, error: 'target_not_found' };
    }

    const beforeStatus = typeof comment.status === 'string' ? comment.status : 'active';
    if (beforeStatus === 'deleted') {
      return {
        ok: false,
        status: 409,
        error: 'target_already_processed',
        targetBeforeStatus: beforeStatus,
        targetAfterStatus: beforeStatus,
      };
    }

    const commentUpdateResult = await commentsCol.updateOne(
      { _id: report.commentId, status: { $ne: 'deleted' } },
      { $set: { status: 'deleted', updatedAt: new Date() } },
      { session },
    );

    if (commentUpdateResult.matchedCount === 0) {
      return {
        ok: false,
        status: 409,
        error: 'target_already_processed',
        targetBeforeStatus: beforeStatus,
      };
    }

    if (commentUpdateResult.modifiedCount !== 1) {
      return {
        ok: false,
        status: 422,
        error: 'target_update_failed',
        targetBeforeStatus: beforeStatus,
      };
    }

    // commentsCount 감소는 0 미만으로 내려가지 않도록 파이프라인 업데이트로 하한(0)을 강제한다.
    if (comment.postId) {
      const commentsCountResult = await postsCol.updateOne(
        { _id: comment.postId },
        [
          {
            $set: {
              commentsCount: {
                $max: [0, { $subtract: [{ $ifNull: ['$commentsCount', 0] }, 1] }],
              },
              updatedAt: '$$NOW',
            },
          },
        ],
        { session },
      );

      if (commentsCountResult.matchedCount === 0) {
        return {
          ok: false,
          status: 409,
          error: 'target_not_found',
          targetBeforeStatus: beforeStatus,
          targetAfterStatus: 'deleted',
        };
      }

      if (commentsCountResult.modifiedCount !== 1) {
        return {
          ok: false,
          status: 422,
          error: 'target_update_failed',
          targetBeforeStatus: beforeStatus,
          targetAfterStatus: 'deleted',
        };
      }
    }

    return {
      ok: true,
      targetBeforeStatus: beforeStatus,
      targetAfterStatus: 'deleted',
      commentsCountAdjusted: Boolean(comment.postId),
    };
  }

  return { ok: false, status: 422, error: 'target_update_failed' };
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db, admin } = guard;

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '') as Action;

  if (!['resolve', 'reject', 'resolve_hide_target'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const reportId = new ObjectId(id);
  const reportsCol = db.collection<CommunityReportDocument>('community_reports');

  const report = await reportsCol.findOne({ _id: reportId });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const nextStatus = action === 'reject' ? 'rejected' : 'resolved';
  const transactionSupported = supportsTransactions(db);
  const requestAt = new Date();
  const userAgent = req.headers.get('user-agent');
  const forwardedFor = req.headers.get('x-forwarded-for');
  const requestIp = forwardedFor?.split(',')[0]?.trim() || null;

  const executeStatusUpdate = async (session?: ClientSession, transactionUsed = false) => {
    let hideTargetResult: ResolveHideTargetResult | null = null;

    // resolve_hide_target는 report 상태를 변경하기 전에 대상 업데이트를 완료해야 한다.
    if (action === 'resolve_hide_target') {
      hideTargetResult = await resolveHideTarget(db, report, session);
      if (!hideTargetResult.ok) {
        return NextResponse.json(
          {
            error: hideTargetResult.error,
            reportStatusPreserved: true,
            targetType: report.targetType,
            reportId: id,
          },
          { status: hideTargetResult.status },
        );
      }
    }

    const now = new Date();
    const targetOutcome = hideTargetResult?.ok ? 'updated' : 'updated';
    const targetAfterStatus = hideTargetResult?.ok ? hideTargetResult.targetAfterStatus : undefined;
    const targetBeforeStatus = hideTargetResult?.ok ? hideTargetResult.targetBeforeStatus : undefined;
    const commentsCountAdjusted = hideTargetResult?.ok ? hideTargetResult.commentsCountAdjusted : false;

    const reportUpdateResult = await reportsCol.updateOne(
      { _id: reportId },
      {
        $set: {
          status: nextStatus,
          resolvedAt: now,
          updatedAt: now,
          resolvedByAdminId: admin._id.toString(),
          resolutionAction: action,
          moderationAudit: {
            actor: {
              adminId: admin._id.toString(),
              email: admin.email ?? null,
              name: admin.name ?? null,
              role: admin.role,
            },
            reportId: id,
            action,
            nextStatus,
            target: {
              type: report.targetType,
              postId: report.postId.toString(),
              commentId: report.commentId?.toString(),
              beforeStatus: targetBeforeStatus,
              afterStatus: targetAfterStatus,
              outcome: targetOutcome,
              commentsCountAdjusted,
            },
            transaction: {
              attempted: transactionSupported,
              used: transactionUsed,
            },
            request: {
              at: requestAt,
              userAgent,
              ip: requestIp,
            },
          },
        },
      },
      { session },
    );

    if (reportUpdateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (reportUpdateResult.modifiedCount !== 1) {
      return NextResponse.json({ error: 'report_update_failed' }, { status: 422 });
    }

    return NextResponse.json({ ok: true });
  };

  // 트랜잭션 가능한 Mongo 토폴로지면 report/target/commentsCount를 하나의 세션 트랜잭션으로 묶는다.
  if (transactionSupported) {
    const session = db.client.startSession();

    try {
      let txResponse: NextResponse | null = null;
      await session.withTransaction(async () => {
        txResponse = await executeStatusUpdate(session, true);
        if (!txResponse || txResponse.status !== 200) {
          throw new TransactionBusinessError(txResponse ?? NextResponse.json({ error: 'transaction_failed' }, { status: 422 }));
        }
      });

      if (txResponse) return txResponse;
    } catch (error) {
      if (error instanceof TransactionBusinessError) {
        return error.response;
      }
    } finally {
      await session.endSession();
    }
  }

  return executeStatusUpdate(undefined, false);
}
