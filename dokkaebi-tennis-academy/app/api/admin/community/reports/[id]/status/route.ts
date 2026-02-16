import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';

type Action = 'resolve' | 'reject' | 'resolve_hide_target';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db } = guard;

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '') as Action;

  if (!['resolve', 'reject', 'resolve_hide_target'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const reportsCol = db.collection('community_reports');
  const postsCol = db.collection('community_posts');
  const commentsCol = db.collection('community_comments');

  const report = await reportsCol.findOne({ _id: new ObjectId(id) });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 1) 대상 숨김이 포함된 경우 먼저 처리 (실패하면 report만 resolved 되는 상황 방지)
  if (action === 'resolve_hide_target') {
    if (report.targetType === 'post' && report.postId) {
      await postsCol.updateOne({ _id: report.postId }, { $set: { status: 'hidden', updatedAt: new Date() } });
    }

    if (report.targetType === 'comment' && report.commentId) {
      const comment = await commentsCol.findOne({ _id: report.commentId }, { projection: { status: 1, postId: 1 } });

      if (comment && comment.status !== 'deleted') {
        await commentsCol.updateOne({ _id: report.commentId }, { $set: { status: 'deleted', updatedAt: new Date() } });

        // 댓글 카운트는 -1 (이미 deleted면 중복 차감 방지)
        if (comment.postId) {
          await postsCol.updateOne({ _id: comment.postId }, { $inc: { commentsCount: -1 }, $set: { updatedAt: new Date() } });
        }
      }
    }
  }

  // 2) 신고 상태 업데이트
  const nextStatus = action === 'reject' ? 'rejected' : 'resolved';
  await reportsCol.updateOne({ _id: new ObjectId(id) }, { $set: { status: nextStatus, resolvedAt: new Date(), updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
