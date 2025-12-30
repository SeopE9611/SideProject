import { NextRequest, NextResponse } from 'next/server';
import type { Filter, SortDirection } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';

type PostDoc = {
  type: string;
  postNo?: number;
  title: string;
  content?: string;
  nickname?: string;
  status?: string; // 'public' | 'hidden'
  createdAt?: Date;
  viewCount?: number;
  likeCount?: number;
  commentsCount?: number;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20) || 20));
  const skip = (page - 1) * limit;

  const type = (searchParams.get('type') ?? 'all').trim();
  const status = (searchParams.get('status') ?? 'all').trim(); // all | public | hidden
  const q = (searchParams.get('q') ?? '').trim();

  const sortKey = (searchParams.get('sort') ?? 'createdAt').trim(); // createdAt|views|likes|comments
  const dir: SortDirection = searchParams.get('dir')?.toLowerCase() === 'asc' ? 1 : -1;

  const filter: Filter<PostDoc> = {};
  if (type !== 'all') filter.type = type as any;
  if (status !== 'all') filter.status = status as any;

  if (q) {
    const r = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ title: r }, { nickname: r }, { content: r }] as any;
  }

  const sortMap: Record<string, any> = {
    createdAt: { createdAt: dir },
    views: { viewCount: dir },
    likes: { likeCount: dir },
    comments: { commentsCount: dir },
  };
  const sortSpec = sortMap[sortKey] ?? { createdAt: -1 };

  const col = db.collection<PostDoc>('community_posts');

  const [items, total] = await Promise.all([
    col
      .find(filter, {
        projection: {
          _id: 1,
          type: 1,
          postNo: 1,
          title: 1,
          nickname: 1,
          status: 1,
          createdAt: 1,
          viewCount: 1,
          likeCount: 1,
          commentsCount: 1,
        },
      })
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return NextResponse.json({
    items: items.map((d) => ({
      id: String(d._id),
      type: d.type,
      postNo: d.postNo ?? null,
      title: d.title,
      nickname: d.nickname ?? '',
      status: d.status ?? 'public',
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
      viewCount: d.viewCount ?? 0,
      likeCount: d.likeCount ?? 0,
      commentsCount: d.commentsCount ?? 0,
    })),
    total,
    page,
    limit,
  });
}
