import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { Filter } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { COMMUNITY_REPORT_SEARCHABLE_FIELDS, type CommunityReportDocument } from '@/lib/types/community-report';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

function maskEmail(email?: string | null) {
  if (!email) return '';
  const [localPart, domainPart] = String(email).split('@');
  if (!localPart || !domainPart) return '';

  const visibleCount = Math.min(2, localPart.length);
  const maskedCount = Math.max(1, localPart.length - visibleCount);
  return `${localPart.slice(0, visibleCount)}${'*'.repeat(maskedCount)}@${domainPart}`;
}

function normalizeReporterUserId(value: unknown) {
  if (!value) return null;
  if (value instanceof ObjectId) return value.toString();

  const asStr = String(value);
  return ObjectId.isValid(asStr) ? asStr : null;
}

function pickDisplayName(user?: { nickname?: string; name?: string; email?: string } | null) {
  if (!user) return '';
  return user.nickname?.trim() || user.name?.trim() || '';
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

  const match: Filter<CommunityReportDocument> = {};
  if (status !== 'all') match.status = status as any;
  if (targetType !== 'all') match.targetType = targetType as any;
  if (boardType !== 'all') match.boardType = boardType as any;

  if (q) {
    const r = new RegExp(escapeRegExp(q), 'i');
    match.$or = COMMUNITY_REPORT_SEARCHABLE_FIELDS.map((field) => ({ [field]: r })) as Filter<CommunityReportDocument>[];
  }

  const col = db.collection<CommunityReportDocument>('community_reports');

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
            reporterUserId: 1,
            reporterEmail: 1,
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

  // 누락된 과거 신고 데이터 fallback 규칙:
  // 1) reporterNickname 비어있으면 users lookup (nickname/name) 시도
  // 2) 그래도 없으면 reporterEmail 마스킹
  // 3) 마지막으로 lookup한 users.email 마스킹
  const fallbackUserIds = Array.from(
    new Set(
      items
        .filter((d: any) => !String(d?.reporterNickname ?? '').trim())
        .map((d: any) => normalizeReporterUserId(d?.reporterUserId))
        .filter((id): id is string => !!id),
    ),
  );

  const fallbackUserMap = new Map<string, { nickname?: string; name?: string; email?: string }>();
  if (fallbackUserIds.length > 0) {
    const users = (await db
      .collection('users')
      .find({ _id: { $in: fallbackUserIds.map((id) => new ObjectId(id)) } }, { projection: { _id: 1, nickname: 1, name: 1, email: 1 } })
      .toArray()) as Array<{ _id: ObjectId; nickname?: string; name?: string; email?: string }>;

    users.forEach((user) => fallbackUserMap.set(user._id.toString(), { nickname: user.nickname, name: user.name, email: user.email }));
  }

  return NextResponse.json({
    items: items.map((d: any) => {
      const reporterUserId = normalizeReporterUserId(d?.reporterUserId);
      const fallbackUser = reporterUserId ? fallbackUserMap.get(reporterUserId) : undefined;
      const reporterDisplay =
        String(d?.reporterNickname ?? '').trim() ||
        pickDisplayName(fallbackUser) ||
        maskEmail(d?.reporterEmail) ||
        maskEmail(fallbackUser?.email) ||
        '-';

      return {
        id: d._id.toString(),
        targetType: d.targetType,
        boardType: d.boardType,
        reason: d.reason,
        status: d.status,
        reporterDisplay,
        reporterNickname: String(d?.reporterNickname ?? '').trim(),
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
      };
    }),
    total,
    page,
    limit,
  });
}
