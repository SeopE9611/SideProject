import { ensureAdminLocksIndexes } from "@/lib/adminLocks.indexes";
import { ensureAdminNotesIndexes } from "@/lib/adminNotes.indexes";
import { ensureAdminOperationsIndexes } from "@/lib/adminOperations.indexes";
import { ensureAuthIndexes } from "@/lib/auth.indexes";
import { ensureBoardIndexes } from "@/lib/boards.indexes";
import { ensureMessageIndexes } from "@/lib/messages.indexes";
import { ensurePassIndexes } from "@/lib/passes.indexes";
import { ensurePointsIndexes } from "@/lib/points.indexes";
import { ensureRentalIndexes } from "@/lib/rentals.indexes";
import { ensureReviewIndexes } from "@/lib/reviews.maintenance";
import { ensureRiskIndexes } from "@/lib/risk.indexes";
import { ensureRevenueReportSnapshotIndexes } from "@/lib/revenueReportSnapshots.indexes";
import { ensureRacketCareIndexes } from "@/lib/racket-care/indexes";
import { ensureUsedRacketsIndexes } from "@/lib/usedRackets.indexes";
import { ensureUserIndexes } from "@/lib/users.indexes";
import { ensureOfflineIndexes } from "@/lib/offline/offline.repository";
import { ensureUserNotificationIndexes } from "@/lib/notifications.indexes";
import { ensureWishlistIndexes } from "@/lib/wishlist.indexes";
import { MongoClient, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const dbName = process.env.MONGODB_DB || "tennis_academy";
const mongoClientOptions: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 7000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxIdleTimeMS: 60000,
  retryReads: true,
  retryWrites: true,
};

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

  // 운영통합센터(admin operations) 검색 인덱스 보장 상태
  var _adminOperationsIndexesReady: Promise<void> | null | undefined;

  // 관리자 내부 메모 인덱스 보장 상태
  var _adminNotesIndexesReady: Promise<void> | null | undefined;

  // boards 컬렉션 인덱스 보장 상태
  var _boardsIndexesReady: Promise<void> | null | undefined;

  // rentals 컬렉션 인덱스 보장 상태
  var _rentalsIndexesReady: Promise<void> | null | undefined;

  // 메시지 컬렉션 인덱스 보장 상태
  var _messagesIndexesReady: Promise<void> | null | undefined;

  // 사용자 인앱 알림 컬렉션 인덱스 보장 상태
  var _userNotificationIndexesReady: Promise<void> | null | undefined;

  // 포인트(적립금) 원장 컬렉션 인덱스 보장 상태
  var _pointsIndexesReady: Promise<void> | null | undefined;

  // 라켓 검색 인덱스 보장 상태
  var _usedRacketsIndexesReady: Promise<void> | null | undefined;

  // cancel/refund 리스크 시그널 인덱스 보장 상태
  var _riskIndexesReady: Promise<void> | null | undefined;

  // 월별 매출 리포트 스냅샷 인덱스 보장 상태
  var _revenueReportSnapshotIndexesReady: Promise<void> | null | undefined;

  // 라켓 케어 컬렉션 인덱스 보장 상태
  var _racketCareIndexesReady: Promise<void> | null | undefined;
  var _offlineIndexesReady: Promise<void> | null | undefined;

  // 런타임 인덱스 보장 실패 후 재시도 시각(반복 요청의 즉시 재시도 방지)
  var _runtimeIndexesRetryAfter: number | undefined;
}

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
      listIndexes: () => createMockCursor(),
      createIndex: async () => undefined,
      createIndexes: async () => [],
    });

    const mockClient = {
      db: () => ({
        collection: () => createMockCollection(),
        createCollection: async () => undefined,
      }),
    } as unknown as MongoClient;

    clientPromise = Promise.resolve(mockClient);
  } else {
    clientPromise = Promise.reject(new Error("MONGODB_URI 환경변수가 설정되지 않았습니다."));
  }
} else {
  const getMongoClient = async () => {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, mongoClientOptions);
      global._mongoClientPromise = client.connect().catch(async (error) => {
        global._mongoClientPromise = undefined;
        await client.close().catch(() => undefined);
        throw error;
      });
    }
    return global._mongoClientPromise;
  };

  clientPromise = {
    then: (onFulfilled, onRejected) => getMongoClient().then(onFulfilled, onRejected),
  } as Promise<MongoClient>;
}

// 다른 곳에서 필요하면 default 로 가져다 쓸 수 있게 유지
export default clientPromise;

/**
 * getDb()
 * - Mongo 연결을 보장하고 DB 핸들을 반환
 * - 리뷰 인덱스를 생명주기당 1회만 보장(아이들포턴트)
 */
const RUNTIME_INDEX_RETRY_COOLDOWN_MS = 60_000;

function scheduleRuntimeIndexRetry() {
  global._runtimeIndexesRetryAfter = Date.now() + RUNTIME_INDEX_RETRY_COOLDOWN_MS;
}

export async function getDb() {
  const c = await clientPromise; // lazy connect + 실패한 Promise 재사용 방지
  const db = c.db(dbName);
  const canStartRuntimeIndexEnsures =
    !global._runtimeIndexesRetryAfter || global._runtimeIndexesRetryAfter <= Date.now();

  // 핵심: 인덱스 보장을 "순차 await" 하지 않고, 같은 요청 안에서 병렬로 시작한다.
  // - 기존 구조는 첫 요청/콜드스타트에서 ensure*Indexes를 하나씩 기다려서 지연이 누적됐다.
  // - Promise.all 병렬화는 "동시에 시작"만 개선하고, await Promise.all(...)이 남아 있으면
  //   첫 요청이 "모든 인덱스 보장 완료"까지 기다린다는 점은 동일하다.
  if (canStartRuntimeIndexEnsures && !global._passesIndexesReady) {
    global._passesIndexesReady = ensurePassIndexes(db).catch((e) => {
      console.error("[passes] ensurePassIndexes failed", e);
      // 실패 시 쿨다운 후 재시도되도록 null 처리
      scheduleRuntimeIndexRetry();
      global._passesIndexesReady = null;
    });
  }

  // auth(oauth_pending_signups, user_sessions) 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._authIndexesReady) {
    global._authIndexesReady = ensureAuthIndexes(db).catch((e) => {
      console.error("[auth] ensureAuthIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._authIndexesReady = null;
    });
  }

  // boards 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._boardsIndexesReady) {
    global._boardsIndexesReady = ensureBoardIndexes(db).catch((e) => {
      console.error("[boards] ensureBoardIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._boardsIndexesReady = null;
    });
  }

  // rentals 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._rentalsIndexesReady) {
    global._rentalsIndexesReady = ensureRentalIndexes(db).catch((e) => {
      console.error("[rentals] ensureRentalIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._rentalsIndexesReady = null;
    });
  }

  // messages 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._messagesIndexesReady) {
    global._messagesIndexesReady = ensureMessageIndexes(db).catch((e) => {
      console.error("[messages] ensureMessageIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._messagesIndexesReady = null;
    });
  }

  // user_notifications 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._userNotificationIndexesReady) {
    global._userNotificationIndexesReady = ensureUserNotificationIndexes(db).catch((e) => {
      console.error("[user_notifications] ensureUserNotificationIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._userNotificationIndexesReady = null;
    });
  }

  // points 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._pointsIndexesReady) {
    global._pointsIndexesReady = ensurePointsIndexes(db).catch((e) => {
      console.error("[points] ensurePointsIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._pointsIndexesReady = null;
    });
  }

  // used_rackets (Finder 범위검색 성능)
  if (canStartRuntimeIndexEnsures && !global._usedRacketsIndexesReady) {
    global._usedRacketsIndexesReady = ensureUsedRacketsIndexes(db).catch((e) => {
      console.error("[used_rackets] ensureUsedRacketsIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._usedRacketsIndexesReady = null;
    });
  }

  // wishlists 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._wishlistIndexesReady) {
    global._wishlistIndexesReady = ensureWishlistIndexes(db).catch((e) => {
      console.error("[wishlists] ensureWishlistIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._wishlistIndexesReady = null;
    });
  }

  // admin_locks 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._adminLocksIndexesReady) {
    global._adminLocksIndexesReady = ensureAdminLocksIndexes(db).catch((e) => {
      console.error("[admin_locks] ensureAdminLocksIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._adminLocksIndexesReady = null;
    });
  }

  // admin operations 검색 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._adminOperationsIndexesReady) {
    global._adminOperationsIndexesReady = ensureAdminOperationsIndexes(db).catch((e) => {
      console.error("[admin-operations] ensureAdminOperationsIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._adminOperationsIndexesReady = null;
    });
  }

  // admin_notes 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._adminNotesIndexesReady) {
    global._adminNotesIndexesReady = ensureAdminNotesIndexes(db).catch((e) => {
      console.error("[admin_notes] ensureAdminNotesIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._adminNotesIndexesReady = null;
    });
  }

  // users 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._usersIndexesReady) {
    global._usersIndexesReady = ensureUserIndexes(db).catch((e) => {
      console.error("[users] ensureUserIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._usersIndexesReady = null; // 실패 시 쿨다운 후 재시도
    });
  }

  // cancel_refund_risk_signals 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._riskIndexesReady) {
    global._riskIndexesReady = ensureRiskIndexes(db).catch((e) => {
      console.error("[risk] ensureRiskIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._riskIndexesReady = null;
    });
  }

  // revenue_report_snapshots 인덱스 보장(1회)

  // 라켓 케어 인덱스 보장(1회)
  if (canStartRuntimeIndexEnsures && !global._racketCareIndexesReady) {
    global._racketCareIndexesReady = ensureRacketCareIndexes(db).catch((e) => {
      console.error("[racket-care] ensureRacketCareIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._racketCareIndexesReady = null;
    });
  }

  if (canStartRuntimeIndexEnsures && !global._revenueReportSnapshotIndexesReady) {
    global._revenueReportSnapshotIndexesReady = ensureRevenueReportSnapshotIndexes(db).catch(
      (e) => {
        console.error("[revenue_report_snapshots] ensureRevenueReportSnapshotIndexes failed", e);
        scheduleRuntimeIndexRetry();
        global._revenueReportSnapshotIndexesReady = null;
      },
    );
  }

  if (canStartRuntimeIndexEnsures && !global._offlineIndexesReady) {
    global._offlineIndexesReady = ensureOfflineIndexes(db).catch((e) => {
      console.error("[offline] ensureOfflineIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._offlineIndexesReady = null;
    });
  }

  if (canStartRuntimeIndexEnsures && !global._reviewsIndexesReady) {
    global._reviewsIndexesReady = ensureReviewIndexes(db).catch((e) => {
      console.error("[reviews] ensureReviewIndexes failed", e);
      scheduleRuntimeIndexRetry();
      global._reviewsIndexesReady = null;
    });
  }

  const runtimeIndexesReady = [
    global._passesIndexesReady,
    global._authIndexesReady,
    global._boardsIndexesReady,
    global._rentalsIndexesReady,
    global._messagesIndexesReady,
    global._userNotificationIndexesReady,
    global._pointsIndexesReady,
    global._usedRacketsIndexesReady,
    global._wishlistIndexesReady,
    global._adminLocksIndexesReady,
    global._adminOperationsIndexesReady,
    global._adminNotesIndexesReady,
    global._usersIndexesReady,
    global._riskIndexesReady,
    global._revenueReportSnapshotIndexesReady,
    global._reviewsIndexesReady,
    global._offlineIndexesReady,
  ];

  // 운영 환경 최적화(Production non-blocking 정책):
  // - production에서는 "요청 경로 지연"을 줄이기 위해 getDb()가 인덱스 완료를 await 하지 않는다.
  // - 즉, 요청 처리와 인덱스 보장을 분리하고 인덱스 보장은 백그라운드로 시작만 한다.
  //
  // 왜 ensure-runtime-indexes가 더 중요해졌나?
  // - production에서 요청이 인덱스 완료를 기다리지 않으므로, 배포 전에 필요한 인덱스를 미리 맞춰두어야
  //   첫 트래픽부터 안정적인 실행계획(인덱스 기반)을 기대할 수 있다.
  // - 따라서 scripts/db/ensure-runtime-indexes.mjs 의 범위는 아래 runtimeIndexesReady(=getDb 관리 범위)와
  //   항상 동일해야 한다. 둘이 어긋나면 "정책은 non-blocking인데 선반영은 누락" 상태가 된다.
  //
  // check/ensure 스크립트 역할 구분:
  // - check-runtime-indexes: 현재 인덱스 상태를 검증(읽기 전용, 생성하지 않음)
  // - ensure-runtime-indexes: 배포 전 인덱스를 실제 생성/보정(쓰기 작업 수행)
  if (process.env.NODE_ENV === "production") {
    void Promise.all(runtimeIndexesReady);
  } else {
    // 개발/테스트에서는 기존처럼 기다려서 인덱스 문제를 초기에 빠르게 드러내는 보수 정책을 유지한다.
    await Promise.all(runtimeIndexesReady);
  }

  return db;
}
