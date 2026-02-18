import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'tennis_academy';
const sampleSize = Number(process.env.SMOKE_SAMPLE_SIZE || '20');

if (!uri) {
  console.error('[smoke-admin-community-posts-metrics] MONGODB_URI is required');
  process.exit(1);
}

function isValidMetricNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const posts = db.collection('community_posts');

    // 배포 전 실데이터 스모크 체크: 최신 게시글 샘플에서 메트릭 필드 숫자 타입 검증
    const samples = await posts
      .find(
        {},
        {
          projection: {
            _id: 1,
            title: 1,
            views: 1,
            likes: 1,
            commentsCount: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(sampleSize)
      .toArray();

    if (samples.length === 0) {
      console.log('[smoke-admin-community-posts-metrics] community_posts 샘플이 없어 검증을 건너뜁니다.');
      return;
    }

    const invalid = samples.filter(
      (doc) => !isValidMetricNumber(doc.views) || !isValidMetricNumber(doc.likes) || !isValidMetricNumber(doc.commentsCount),
    );

    if (invalid.length > 0) {
      console.error(`[smoke-admin-community-posts-metrics] 메트릭 숫자 검증 실패: ${invalid.length}/${samples.length}`);
      for (const doc of invalid.slice(0, 10)) {
        console.error(
          JSON.stringify({
            id: String(doc._id),
            title: doc.title ?? '',
            views: doc.views,
            likes: doc.likes,
            commentsCount: doc.commentsCount,
          }),
        );
      }
      process.exit(1);
    }

    // 운영 점검에 필요한 최소 통계를 함께 출력해 스모크 결과를 빠르게 확인할 수 있도록 한다.
    const totals = samples.reduce(
      (acc, doc) => {
        acc.views += doc.views;
        acc.likes += doc.likes;
        acc.commentsCount += doc.commentsCount;
        return acc;
      },
      { views: 0, likes: 0, commentsCount: 0 },
    );

    console.log(
      `[smoke-admin-community-posts-metrics] PASS sample=${samples.length} totals=${JSON.stringify(totals)}`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[smoke-admin-community-posts-metrics] failed', error);
  process.exit(1);
});
