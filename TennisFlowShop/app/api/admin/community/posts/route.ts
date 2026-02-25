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
  // community_posts 실문서 메트릭 필드
  views?: number;
  likes?: number;
  commentsCount?: number;
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

  const type = (searchParams.get('type') ?? 'all').trim();
  const status = (searchParams.get('status') ?? 'all').trim(); // all | public | hidden
  const q = (searchParams.get('q') ?? '').trim();

  const sortKey = (searchParams.get('sort') ?? 'createdAt').trim(); // createdAt|views|likes|comments
  const dir: SortDirection = searchParams.get('dir')?.toLowerCase() === 'asc' ? 1 : -1;

  const filter: Filter<PostDoc> = {};
  if (type !== 'all') filter.type = type;
  if (status === 'public' || status === 'hidden') filter.status = status;

  if (q) {
    const r = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ title: r }, { nickname: r }, { content: r }];
  }

  // 관리자 정렬키는 실문서 필드(views/likes/commentsCount)만 사용한다.
  const sortMap: Record<string, Record<string, SortDirection>> = {
    createdAt: { createdAt: dir },
    views: { views: dir },
    likes: { likes: dir },
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
          views: 1,
          likes: 1,
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
    items: items.map((d) => {
      const views = d.views ?? 0;
      const likes = d.likes ?? 0;

      return {
        id: String(d._id),
        type: d.type,
        postNo: d.postNo ?? null,
        title: d.title,
        nickname: d.nickname ?? '',
        status: d.status ?? 'public',
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
        views,
        likes,
        commentsCount: d.commentsCount ?? 0,
      };
    }),
    total,
    page,
    limit,
  });
}
