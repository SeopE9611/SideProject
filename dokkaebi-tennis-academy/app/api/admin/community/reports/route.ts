import { NextRequest, NextResponse } from 'next/server';
import type { Filter } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';

type ReportDoc = {
  _id: any;
  targetType: 'post' | 'comment';
  boardType: string;
  postId: any;
  commentId?: any;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  reporterNickname?: string;
  createdAt?: Date;
  resolvedAt?: Date;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { searchParams } = new URL(req.url);
  const page = toInt(searchParams.get('page'), 1, 1, 100000);
  const limit = toInt(searchParams.get('limit'), 20, 1, 50);
  const skip = (page - 1) * limit;

  const status = (searchParams.get('status') ?? 'all').trim(); // all|pending|resolved|rejected
  const targetType = (searchParams.get('targetType') ?? 'all').trim(); // all|post|comment
  const boardType = (searchParams.get('boardType') ?? 'all').trim(); // all|free|market...
  const q = (searchParams.get('q') ?? '').trim();

  const match: Filter<ReportDoc> = {};
  if (status !== 'all') match.status = status as any;
  if (targetType !== 'all') match.targetType = targetType as any;
  if (boardType !== 'all') match.boardType = boardType as any;

  if (q) {
    const r = new RegExp(escapeRegExp(q), 'i');
    match.$or = [{ reason: r }, { reporterNickname: r }] as any;
  }

  const col = db.collection<ReportDoc>('community_reports');

  const [items, total] = await Promise.all([
    col
      .aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },

        // post lookup
        {
          $lookup: {
            from: 'community_posts',
            localField: 'postId',
            foreignField: '_id',
            as: 'post',
          },
        },
        // comment lookup
        {
          $lookup: {
            from: 'community_comments',
            localField: 'commentId',
            foreignField: '_id',
            as: 'comment',
          },
        },
        { $addFields: { post: { $first: '$post' }, comment: { $first: '$comment' } } },

        {
          $project: {
            _id: 1,
            targetType: 1,
            boardType: 1,
            reason: 1,
            status: 1,
            reporterNickname: 1,
            createdAt: 1,
            resolvedAt: 1,
            post: { _id: 1, title: 1, postNo: 1, status: 1 },
            comment: { _id: 1, content: 1, nickname: 1, status: 1 },
          },
        },
      ])
      .toArray(),
    col.countDocuments(match),
  ]);

  return NextResponse.json({
    items: items.map((d: any) => ({
      id: d._id.toString(),
      targetType: d.targetType,
      boardType: d.boardType,
      reason: d.reason,
      status: d.status,
      reporterNickname: d.reporterNickname ?? '',
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
      resolvedAt: d.resolvedAt instanceof Date ? d.resolvedAt.toISOString() : null,
      post: d.post
        ? {
            id: d.post._id?.toString?.() ?? null,
            title: d.post.title ?? '',
            postNo: d.post.postNo ?? null,
            status: d.post.status ?? 'public',
          }
        : null,
      comment: d.comment
        ? {
            id: d.comment._id?.toString?.() ?? null,
            content: d.comment.content ?? '',
            nickname: d.comment.nickname ?? '',
            status: d.comment.status ?? 'active',
          }
        : null,
    })),
    total,
    page,
    limit,
  });
}
