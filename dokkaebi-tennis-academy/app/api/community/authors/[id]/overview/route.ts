import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;

  // ObjectId 유효성 검사
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_author_id' }, { status: 400 });
  }

  const authorObjectId = new ObjectId(id);
  const db = await getDb();
  const postsCol = db.collection('community_posts');
  const commentsCol = db.collection('community_comments');
  const profilesCol = db.collection('player_profiles');

  // 1) 글/댓글 개수
  const [postsCount, commentsCount] = await Promise.all([postsCol.countDocuments({ userId: authorObjectId, status: 'public' }), commentsCol.countDocuments({ userId: authorObjectId, status: 'public' })]);

  // 2) 최근 글 5개
  const recentDocs = await postsCol
    .find(
      { userId: authorObjectId, status: 'public' },
      {
        projection: {
          _id: 1,
          title: 1,
          createdAt: 1,
          views: 1,
          likes: 1,
          commentsCount: 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const recentPosts = recentDocs.map((d) => ({
    id: String(d._id),
    title: d.title ?? '',
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    views: d.views ?? 0,
    likes: d.likes ?? 0,
    commentsCount: d.commentsCount ?? 0,
  }));

  // 3) 활동 시작일(가장 오래된 글 or 댓글)
  const [firstPost] = await postsCol
    .find({ userId: authorObjectId }, { projection: { createdAt: 1 } })
    .sort({ createdAt: 1 })
    .limit(1)
    .toArray();

  const [firstComment] = await commentsCol
    .find({ userId: authorObjectId }, { projection: { createdAt: 1 } })
    .sort({ createdAt: 1 })
    .limit(1)
    .toArray();

  const firstDates = [firstPost?.createdAt instanceof Date ? firstPost.createdAt : null, firstComment?.createdAt instanceof Date ? firstComment.createdAt : null].filter(Boolean) as Date[];

  const firstActivityAt = firstDates.length > 0 ? new Date(Math.min(...firstDates.map((d) => d.getTime()))).toISOString() : null;

  // 테니스 프로필 조회
  const profileDoc = await profilesCol.findOne(
    { userId: authorObjectId },
    {
      projection: {
        level: 1,
        hand: 1,
        playStyle: 1,
        mainRacket: 1,
        mainString: 1,
        note: 1,
        isPublic: 1,
        updatedAt: 1,
      },
    }
  );

  const tennisProfile =
    profileDoc && profileDoc.isPublic === true
      ? {
          level: profileDoc.level ?? '',
          hand: profileDoc.hand ?? '',
          playStyle: profileDoc.playStyle ?? '',
          mainRacket: profileDoc.mainRacket ?? {},
          mainString: profileDoc.mainString ?? {},
          note: profileDoc.note ?? '',
          updatedAt: profileDoc.updatedAt instanceof Date ? profileDoc.updatedAt.toISOString() : null,
        }
      : null;
  return NextResponse.json({
    ok: true,
    authorId: id,
    firstActivityAt,
    stats: {
      posts: postsCount,
      comments: commentsCount,
    },
    recentPosts,
    tennisProfile,
  });
}
