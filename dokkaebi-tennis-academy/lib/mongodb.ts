import { MongoClient } from 'mongodb';
import { ensureReviewIndexes } from '@/lib/reviews.maintenance';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('⛔ MONGODB_URI 환경변수가 설정되지 않았습니다.');

const dbName = process.env.MONGODB_DB || 'tennis_academy';

// ---- 전역 캐시(개발 핫리로드 & 서버리스 콜드스타트 대비) ----
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // 리뷰 인덱스 보장 1회 실행 상태
  var _reviewsIndexesReady: Promise<void> | null | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// 다른 곳에서 필요하면 default 로 가져다 쓸 수 있게 유지
export default clientPromise;

/**
 * getDb()
 * - Mongo 연결을 보장하고 DB 핸들을 반환
 * - 리뷰 인덱스를 생명주기당 1회만 보장(아이들포턴트)
 */
export async function getDb() {
  const c = await clientPromise; // 재할당하지 않도록 변수명 변경
  const db = c.db(dbName);

  // 인덱스 보장: 컨테이너(람다) 생명주기당 1회만 실행
  if (!global._reviewsIndexesReady) {
    global._reviewsIndexesReady = ensureReviewIndexes(db).catch((e) => {
      console.error('[reviews] ensureReviewIndexes failed', e);
      // 실패 시 다음 요청에서 재시도
      global._reviewsIndexesReady = null;
    });
  }
  await global._reviewsIndexesReady; // 실패했어도 다음 요청에서 재시도됨

  return db;
}
