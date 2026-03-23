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
  // - Promise.all 병렬화는 "동시에 시작"만 개선하고, await Promise.all(...)이 남아 있으면
  //   첫 요청이 "모든 인덱스 보장 완료"까지 기다린다는 점은 동일하다.
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

  const runtimeIndexesReady = [
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
  ];

  // 운영 환경 최적화:
  // - 인덱스 보장 책임을 요청 경로 밖(배포 전 ensure 스크립트 + 백그라운드 재확인)으로 더 밀어내기 위해
  //   production에서는 getDb()가 인덱스 완료를 기다리지 않는다.
  // - 대신 첫 요청에서 비차단으로 보장을 시작해, 혹시 선반영이 누락된 경우에도 자동 보정(fallback)을 유지한다.
  // - fallback을 완전히 제거하면 운영 절차 누락 시 성능/정합성 리스크가 커지므로 최소 안전망은 남긴다.
  if (process.env.NODE_ENV === "production") {
    void Promise.all(runtimeIndexesReady);
  } else {
    // 개발/테스트에서는 기존처럼 기다려서 인덱스 문제를 초기에 빠르게 드러내는 보수 정책을 유지한다.
    await Promise.all(runtimeIndexesReady);
  }

  return db;
}
