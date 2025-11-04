import { MongoClient } from 'mongodb';
import { ensureReviewIndexes } from '@/lib/reviews.maintenance';
import { ensurePassIndexes } from '@/lib/passes.indexes';
import { ensureBoardIndexes } from '@/lib/boards.indexes';
import { ensureRentalIndexes } from '@/lib/rentals.indexes';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('⛔ MONGODB_URI 환경변수가 설정되지 않았습니다.');

const dbName = process.env.MONGODB_DB || 'tennis_academy';

// ---- 전역 캐시(개발 핫리로드 & 서버리스 콜드스타트 대비) ----
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // 리뷰 인덱스 보장 1회 실행 상태
  var _reviewsIndexesReady: Promise<void> | null | undefined;

  // DB 커넥션이 만들어질 때 인덱스 보장 함수들을 컨테이너 생애당 1회만 실행
  var _passesIndexesReady: Promise<void> | null | undefined;

  // users 컬렉션 인덱스 보장 상태
  var _usersIndexesReady: Promise<void> | null | undefined;

  // boards 컬렉션 인덱스 보장 상태
  var _boardsIndexesReady: Promise<void> | null | undefined;

  // rentals 컬렉션 인덱스 보장 상태
  var _rentalsIndexesReady: Promise<void> | null | undefined;
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

  if (!global._passesIndexesReady) {
    global._passesIndexesReady = ensurePassIndexes(db).catch((e) => {
      console.error('[passes] ensurePassIndexes failed', e);
      // 실패 시 다음 요청에서 재시도되도록 null 처리
      global._passesIndexesReady = null;
    });
  }
  await global._passesIndexesReady; // 실패했어도 다음 요청에서 재시도됨

  // boards 인덱스 보장(1회)
  if (!global._boardsIndexesReady) {
    global._boardsIndexesReady = ensureBoardIndexes(db).catch((e) => {
      console.error('[boards] ensureBoardIndexes failed', e);
      global._boardsIndexesReady = null;
    });
  }
  await global._boardsIndexesReady;

  // rentals 인덱스 보장(1회)
  if (!global._rentalsIndexesReady) {
    global._rentalsIndexesReady = ensureRentalIndexes(db).catch((e) => {
      console.error('[rentals] ensureRentalIndexes failed', e);
      global._rentalsIndexesReady = null;
    });
  }
  await global._rentalsIndexesReady;

  // users.email unique 인덱스 보장
  if (!global._usersIndexesReady) {
    global._usersIndexesReady = (async () => {
      // 이메일은 회원가입 시 toLowerCase() 하므로 { email: 1 } unique로 충분
      await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
      // role, createdAt 등 보조 인덱스도 여기서 보장 가능
      // await db.collection('users').createIndex({ role: 1 });
      // await db.collection('users').createIndex({ createdAt: -1 });
    })().catch((e) => {
      console.error('[users] ensureUsersIndexes failed', e);
      global._usersIndexesReady = null; // 실패 시 다음 요청에서 재시도
    });
  }
  await global._usersIndexesReady;

  if (!global._reviewsIndexesReady) {
    global._reviewsIndexesReady = ensureReviewIndexes(db).catch((e) => {
      console.error('[reviews] ensureReviewIndexes failed', e);
      global._reviewsIndexesReady = null;
    });
  }
  await global._reviewsIndexesReady;

  return db;
}
