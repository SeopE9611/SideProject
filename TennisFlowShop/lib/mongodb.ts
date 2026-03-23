import { ensureAdminLocksIndexes } from "@/lib/adminLocks.indexes";
import { ensureAuthIndexes } from "@/lib/auth.indexes";
import { ensureBoardIndexes } from "@/lib/boards.indexes";
import { ensureMessageIndexes } from "@/lib/messages.indexes";
import { ensurePassIndexes } from "@/lib/passes.indexes";
import { ensurePointsIndexes } from "@/lib/points.indexes";
import { ensureRentalIndexes } from "@/lib/rentals.indexes";
import { ensureReviewIndexes } from "@/lib/reviews.maintenance";
import { ensureUsedRacketsIndexes } from "@/lib/usedRackets.indexes";
import { ensureUserIndexes } from "@/lib/users.indexes";
import { ensureWishlistIndexes } from "@/lib/wishlist.indexes";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const dbName = process.env.MONGODB_DB || "tennis_academy";

// ---- 전역 캐시(개발 핫리로드 & 서버리스 콜드스타트 대비) ----
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // 리뷰 인덱스 보장 1회 실행 상태
  var _reviewsIndexesReady: Promise<void> | null | undefined;

  // DB 커넥션이 만들어질 때 인덱스 보장 함수들을 컨테이너 생애당 1회만 실행
  var _passesIndexesReady: Promise<void> | null | undefined;

  // users 컬렉션 인덱스 보장 상태
  var _usersIndexesReady: Promise<void> | null | undefined;

  // oauth/login 관련 인덱스 보장 상태
  var _authIndexesReady: Promise<void> | null | undefined;

  // 위시리스트 인덱스 보장 상태
  var _wishlistIndexesReady: Promise<void> | null | undefined;

  // admin_locks 인덱스 보장 상태
  var _adminLocksIndexesReady: Promise<void> | null | undefined;

  // boards 컬렉션 인덱스 보장 상태
  var _boardsIndexesReady: Promise<void> | null | undefined;

  // rentals 컬렉션 인덱스 보장 상태
  var _rentalsIndexesReady: Promise<void> | null | undefined;

  // 메시지 컬렉션 인덱스 보장 상태
  var _messagesIndexesReady: Promise<void> | null | undefined;

  // 포인트(적립금) 원장 컬렉션 인덱스 보장 상태
  var _pointsIndexesReady: Promise<void> | null | undefined;

  // 라켓 검색 인덱스 보장 상태
  var _usedRacketsIndexesReady: Promise<void> | null | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  if (isBuildPhase) {
    const createMockCursor = () => {
      const cursor: any = {
        sort: () => cursor,
        limit: () => cursor,
        skip: () => cursor,
        project: () => cursor,
        toArray: async () => [],
      };
      return cursor;
    };

    const createMockCollection = () => ({
      find: () => createMockCursor(),
      aggregate: () => createMockCursor(),
      findOne: async () => null,
      findOneAndUpdate: async () => ({ value: null }),
      updateOne: async () => ({
        matchedCount: 0,
        modifiedCount: 0,
        upsertedId: null,
      }),
      updateMany: async () => ({ matchedCount: 0, modifiedCount: 0 }),
      insertOne: async () => ({ insertedId: null }),
      insertMany: async () => ({ insertedIds: [] }),
      deleteOne: async () => ({ deletedCount: 0 }),
      deleteMany: async () => ({ deletedCount: 0 }),
      countDocuments: async () => 0,
      estimatedDocumentCount: async () => 0,
      distinct: async () => [],
      indexes: async () => [],
      createIndex: async () => undefined,
    });

    const mockClient = {
      db: () => ({
        collection: () => createMockCollection(),
        createCollection: async () => undefined,
      }),
    } as unknown as MongoClient;

    clientPromise = Promise.resolve(mockClient);
  } else {
    clientPromise = Promise.reject(
      new Error("MONGODB_URI 환경변수가 설정되지 않았습니다."),
    );
  }
} else if (process.env.NODE_ENV === "development") {
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

  // 핵심: 인덱스 보장을 "순차 await" 하지 않고, 같은 요청 안에서 병렬로 시작한다.
  // - 기존 구조는 첫 요청/콜드스타트에서 ensure*Indexes를 하나씩 기다려서 지연이 누적됐다.
  // - 아래처럼 Promise를 먼저 전부 만들어 두면, MongoDB가 가능한 범위에서 동시에 처리하여
  //   요청 경로의 블로킹 시간을 줄일 수 있다(프로세스 생애당 1회 캐시 동작은 그대로 유지).
  if (!global._passesIndexesReady) {
    global._passesIndexesReady = ensurePassIndexes(db).catch((e) => {
      console.error("[passes] ensurePassIndexes failed", e);
      // 실패 시 다음 요청에서 재시도되도록 null 처리
      global._passesIndexesReady = null;
    });
  }

  // auth(oauth_pending_signups, user_sessions) 인덱스 보장(1회)
  if (!global._authIndexesReady) {
    global._authIndexesReady = ensureAuthIndexes(db).catch((e) => {
      console.error("[auth] ensureAuthIndexes failed", e);
      global._authIndexesReady = null;
    });
  }

  // boards 인덱스 보장(1회)
  if (!global._boardsIndexesReady) {
    global._boardsIndexesReady = ensureBoardIndexes(db).catch((e) => {
      console.error("[boards] ensureBoardIndexes failed", e);
      global._boardsIndexesReady = null;
    });
  }

  // rentals 인덱스 보장(1회)
  if (!global._rentalsIndexesReady) {
    global._rentalsIndexesReady = ensureRentalIndexes(db).catch((e) => {
      console.error("[rentals] ensureRentalIndexes failed", e);
      global._rentalsIndexesReady = null;
    });
  }

  // messages 인덱스 보장(1회)
  if (!global._messagesIndexesReady) {
    global._messagesIndexesReady = ensureMessageIndexes(db).catch((e) => {
      console.error("[messages] ensureMessageIndexes failed", e);
      global._messagesIndexesReady = null;
    });
  }

  // points 인덱스 보장(1회)
  if (!global._pointsIndexesReady) {
    global._pointsIndexesReady = ensurePointsIndexes(db).catch((e) => {
      console.error("[points] ensurePointsIndexes failed", e);
      global._pointsIndexesReady = null;
    });
  }

  // used_rackets (Finder 범위검색 성능)
  if (!global._usedRacketsIndexesReady) {
    global._usedRacketsIndexesReady = ensureUsedRacketsIndexes(db).catch(
      (e) => {
        console.error("[used_rackets] ensureUsedRacketsIndexes failed", e);
        global._usedRacketsIndexesReady = null;
      },
    );
  }

  // wishlists 인덱스 보장(1회)
  if (!global._wishlistIndexesReady) {
    global._wishlistIndexesReady = ensureWishlistIndexes(db).catch((e) => {
      console.error("[wishlists] ensureWishlistIndexes failed", e);
      global._wishlistIndexesReady = null;
    });
  }

  // admin_locks 인덱스 보장(1회)
  if (!global._adminLocksIndexesReady) {
    global._adminLocksIndexesReady = ensureAdminLocksIndexes(db).catch((e) => {
      console.error("[admin_locks] ensureAdminLocksIndexes failed", e);
      global._adminLocksIndexesReady = null;
    });
  }

  // users 인덱스 보장(1회)
  if (!global._usersIndexesReady) {
    global._usersIndexesReady = ensureUserIndexes(db).catch((e) => {
      console.error("[users] ensureUserIndexes failed", e);
      global._usersIndexesReady = null; // 실패 시 다음 요청에서 재시도
    });
  }

  if (!global._reviewsIndexesReady) {
    global._reviewsIndexesReady = ensureReviewIndexes(db).catch((e) => {
      console.error("[reviews] ensureReviewIndexes failed", e);
      global._reviewsIndexesReady = null;
    });
  }

  await Promise.all([
    global._passesIndexesReady,
    global._authIndexesReady,
    global._boardsIndexesReady,
    global._rentalsIndexesReady,
    global._messagesIndexesReady,
    global._pointsIndexesReady,
    global._usedRacketsIndexesReady,
    global._wishlistIndexesReady,
    global._adminLocksIndexesReady,
    global._usersIndexesReady,
    global._reviewsIndexesReady,
  ]);

  return db;
}
