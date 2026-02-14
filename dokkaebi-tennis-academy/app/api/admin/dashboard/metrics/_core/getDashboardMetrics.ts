import type { Db } from 'mongodb';
/** Responsibility: query collection + aggregation transform + DTO mapping (legacy core). */

/**
 * Admin Dashboard Metrics API
 * - 대시보드에서 필요한 데이터를 "한 번에" 내려주기 위한 엔드포인트
 * - 프론트에서 여러 API를 동시에 때리면 느려지거나, 지표 정의가 분산되어 서로 다른 숫자가 나올 수 있어서
 *   서버에서 집계 기준을 통일해줍니다.
 *
 * 주의:
 * - 프로젝트는 KST(Asia/Seoul, UTC+9) 기준으로 "일/월" 경계를 잡는 경우가 많아서,
 *   집계에서도 KST 날짜 경계를 사용합니다.
 */

// ----------------------------- KST 유틸 -----------------------------

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// "KST 기준" 날짜 파츠를 얻기 위해, 시간을 +9h 시프트한 뒤 UTC getter를 사용합니다.
function getKstParts(dateUtc: Date) {
  const shifted = new Date(dateUtc.getTime() + KST_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

function toYmd({ y, m, d }: { y: number; m: number; d: number }) {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

// KST 기준 YYYYMM (예: 202510)
function fmtYyyymmKst(dateUtc: Date) {
  const { y, m } = getKstParts(dateUtc);
  return `${y}${String(m).padStart(2, '0')}`;
}

// YYYYMM을 월 단위로 이동 (deltaMonths: -1 = 이전달, +1 = 다음달)
function shiftYyyymm(yyyymm: string, deltaMonths: number) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)); // 1~12
  const dt = new Date(Date.UTC(y, m - 1 + deltaMonths, 1, 0, 0, 0));
  const ny = dt.getUTCFullYear();
  const nm = dt.getUTCMonth() + 1;
  return `${ny}${String(nm).padStart(2, '0')}`;
}

// KST 자정(00:00)을 UTC Date로 변환
function kstDayStartUtc(y: number, m: number, d: number) {
  // KST 00:00 = UTC 전날 15:00
  return new Date(Date.UTC(y, m - 1, d, -9, 0, 0, 0));
}

function addKstDays(parts: { y: number; m: number; d: number }, deltaDays: number) {
  // parts를 "UTC 기준 날짜"로 만들기 위해, 임의로 UTC 00:00을 넣고 연산
  // (어차피 우리는 UTC getter로 읽을 것이므로 문제 없음)
  const base = new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 0, 0, 0, 0));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return { y: base.getUTCFullYear(), m: base.getUTCMonth() + 1, d: base.getUTCDate() };
}

function buildYmdRange(endInclusiveUtc: Date, days: number) {
  const endKst = getKstParts(endInclusiveUtc);
  const startKst = addKstDays(endKst, -(days - 1));
  const ymds: string[] = [];
  for (let i = 0; i < days; i += 1) {
    ymds.push(toYmd(addKstDays(startKst, i)));
  }
  return { startKst, endKst, ymds };
}

// 일별 시리즈 (Mongo) -> { 'YYYY-MM-DD': number } 형태로 변환
function rowsToMap(rows: Array<{ _id: string; v: number }>) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r._id] = Number(r.v || 0);
  }
  return map;
}

function mergeSeries(ymds: string[], ...maps: Array<Record<string, number>>) {
  return ymds.map((date) => ({
    date,
    value: maps.reduce((sum, m) => sum + Number(m?.[date] || 0), 0),
  }));
}

// ----------------------------- 상태값 정규화(집계용) -----------------------------
// DB에 한글/영문 상태가 섞여 있어도 KPI/운영큐 집계가 누락되지 않도록, $in 매칭 기준을 통일
const PAYMENT_PAID_VALUES = ['결제완료', 'paid', 'confirmed'];
const PAYMENT_PENDING_VALUES = ['결제대기', 'pending'];
const CANCEL_REQUESTED_VALUES = ['requested', '요청'];

// ----------------------------- 응답 타입 -----------------------------

type KpiBlock = {
  total: number;
  delta7d: number;
};

type Distribution = Array<{ label: string; count: number }>;

type DashboardMetrics = {
  generatedAt: string;

  // 기준 범위(주로 그래프에 사용)
  series: {
    days: number;
    fromYmd: string;
    toYmd: string;

    // 매출(결제완료 기준) - orders + applications + packageOrders 합산
    dailyRevenue: Array<{ date: string; value: number }>;
    // 매출 분해(결제완료 기준) - 주문/신청/패키지 별로 보기
    dailyRevenueBySource: Array<{ date: string; orders: number; applications: number; packages: number; total: number }>;

    // 생성량(결제와 무관) - 운영 트래픽 확인용
    dailyOrders: Array<{ date: string; value: number }>;
    dailyApplications: Array<{ date: string; value: number }>;
    dailySignups: Array<{ date: string; value: number }>;
    dailyReviews: Array<{ date: string; value: number }>;
  };

  kpi: {
    users: KpiBlock & { active7d: number; byProvider: { local: number; kakao: number; naver: number } };
    orders: KpiBlock & { paid7d: number; revenue7d: number; aov7d: number };
    applications: KpiBlock & { paid7d: number; revenue7d: number };
    rentals: KpiBlock & { paid7d: number; revenue7d: number };
    packages: KpiBlock & { paid7d: number; revenue7d: number };

    // 리뷰(상품/서비스)
    reviews: KpiBlock & {
      avg: number;
      five: number;
      byType: { product: number; service: number };
      byRating: { one: number; two: number; three: number; four: number; five: number };
    };

    points: { issued7d: number; spent7d: number };
    community: { posts7d: number; comments7d: number; pendingReports: number };
    inventory: { lowStockProducts: number; outOfStockProducts: number; inactiveRackets: number };
    queue: {
      cancelRequests: number;
      shippingPending: number;
      paymentPending24h: number;
      rentalOverdue: number;
      rentalDueSoon: number;
      passExpiringSoon: number;
      outboxQueued: number;
      outboxFailed: number;
      stringingAging3d: number;
    };
  };

  dist: {
    orderStatus: Distribution;
    orderPaymentStatus: Distribution;
    applicationStatus: Distribution;
  };

  inventoryList: {
    lowStock: Array<{ id: string; name: string; brand: string; stock: number; lowStock: number | null }>;
    outOfStock: Array<{ id: string; name: string; brand: string; stock: number }>;
  };

  // 판매 상위(최근 7일, 결제완료 기준)
  top: {
    products7d: Array<{ productId: string; name: string; brand: string; qty: number; revenue: number }>;
    brands7d: Array<{ brand: string; qty: number; revenue: number }>;
  };

  queueDetails: {
    cancelRequests: Array<{
      kind: 'order' | 'application' | 'rental';
      id: string;
      createdAt: string;
      name: string;
      amount: number;
      status: string;
      paymentStatus?: string;
      href: string;
    }>;

    shippingPending: Array<{
      kind: 'order' | 'application';
      id: string;
      createdAt: string;
      name: string;
      amount: number;
      status: string;
      paymentStatus: string;
      href: string;
    }>;

    // 결제 대기(24h) "리스트" (Top 카드 상세 목록용)
    paymentPending24h: Array<{
      kind: 'order' | 'application' | 'rental' | 'package';
      id: string;
      createdAt: string;
      name: string;
      amount: number;
      status: string;
      href: string;
      hoursAgo: number; // 몇 시간 경과했는지 (배지 표시)
    }>;

    passExpiringSoon: Array<{
      id: string;
      expiresAt: string;
      name: string;
      remainingCount: number;
      daysLeft: number;
      href: string;
    }>;

    rentalOverdue: Array<{
      id: string;
      dueAt: string;
      name: string;
      amount: number;
      overdueDays: number;
      href: string;
    }>;

    rentalDueSoon: Array<{
      id: string;
      dueAt: string;
      name: string;
      amount: number;
      dueInHours: number;
      href: string;
    }>;

    stringingAging: Array<{
      id: string;
      createdAt: string;
      name: string;
      status: string;
      paymentStatus: string;
      totalPrice: number;
      ageDays: number;
      href: string;
    }>;

    outboxBacklog: Array<{
      id: string;
      href: string;
      createdAt: string;
      status: 'queued' | 'failed' | 'sent';
      eventType: string;
      to: string | null;
      retries: number;
      error: string | null;
    }>;
  };

  recent: {
    orders: Array<{ id: string; createdAt: string; name: string; totalPrice: number; status: string; paymentStatus: string }>;
    applications: Array<{ id: string; createdAt: string; name: string; totalPrice: number; status: string; paymentStatus: string }>;
    rentals: Array<{ id: string; createdAt: string; name: string; total: number; status: string }>;
    reports: Array<{ id: string; createdAt: string; kind: 'post' | 'comment'; reason: string }>;
  };
  settlements: {
    currentYyyymm: string;
    prevYyyymm: string;
    hasCurrentSnapshot: boolean;
    hasPrevSnapshot: boolean;
    latest: null | {
      yyyymm: string;
      lastGeneratedAt: string | null;
      lastGeneratedBy: string | null;
    };
  };
};

export async function getDashboardMetrics(db: Db) {

  const now = new Date();
  // 3일(72h) 기준: 운영 큐에서 '장기 미처리' 판단에 사용
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // 결제 대기(24h+) 기준 시각
  // - now 기준 24시간 이전(<=)에 생성됐는데 아직 결제대기인 건을 운영 큐로 올린다.
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 그래프(최근 30일)
  const CHART_DAYS = 30;
  const { startKst: chartStartKst, endKst: chartEndKst, ymds } = buildYmdRange(now, CHART_DAYS);
  const chartStartUtc = kstDayStartUtc(chartStartKst.y, chartStartKst.m, chartStartKst.d);

  // 7일 KPI
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 월 KPI(이번 달 1일 KST 00:00)
  const kstNow = getKstParts(now);
  const monthStartUtc = kstDayStartUtc(kstNow.y, kstNow.m, 1);

  // ----------------------------- Users -----------------------------

  const usersCol = db.collection('users');

  const totalUsersP = usersCol.countDocuments({});
  const newUsers7dP = usersCol.countDocuments({ createdAt: { $gte: since7d } });
  const activeUsers7dP = usersCol.countDocuments({ lastLoginAt: { $gte: since7d } });

  const usersByProviderP = (async () => {
    const [kakao, naver] = await Promise.all([usersCol.countDocuments({ 'oauth.kakao.id': { $exists: true, $ne: null } }), usersCol.countDocuments({ 'oauth.naver.id': { $exists: true, $ne: null } })]);
    const total = await usersCol.countDocuments({});
    const local = Math.max(0, total - kakao - naver);
    return { local, kakao, naver };
  })();

  const dailySignupsP = usersCol
    .aggregate<{ _id: string; v: number }>([
      { $match: { createdAt: { $gte: chartStartUtc, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+09:00' } },
          v: { $sum: 1 },
        },
      },
    ])
    .toArray();

  // ----------------------------- Orders -----------------------------

  const ordersCol = db.collection('orders');

  const totalOrdersP = ordersCol.countDocuments({});
  const newOrders7dP = ordersCol.countDocuments({ createdAt: { $gte: since7d } });

  // 결제완료(=매출 인정) 기준
  const paidOrders7dP = ordersCol.countDocuments({ paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } });
  const revenueOrders7dP = ordersCol.aggregate<{ _id: null; v: number }>([{ $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } } }, { $group: { _id: null, v: { $sum: { $ifNull: ['$totalPrice', 0] } } } }]).toArray();

  const revenueOrdersMonthP = ordersCol
    .aggregate<{ _id: null; v: number }>([{ $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: monthStartUtc, $lte: now } } }, { $group: { _id: null, v: { $sum: { $ifNull: ['$totalPrice', 0] } } } }])
    .toArray();

  // 판매 상위(최근 7일, 결제완료 주문 기준)
  const topProducts7dP = ordersCol
    .aggregate<{
      _id: any;
      name: string;
      brand: string;
      qty: number;
      revenue: number;
    }>([
      { $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } } },
      { $unwind: '$items' },
      { $match: { 'items.kind': 'product' } },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: { $ifNull: ['$items.name', ''] } },
          brand: { $first: { $ifNull: ['$items.brand', ''] } },
          qty: { $sum: { $ifNull: ['$items.quantity', 0] } },
          revenue: {
            $sum: {
              $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 0] }],
            },
          },
        },
      },
      { $sort: { revenue: -1, qty: -1 } },
      { $limit: 10 },
    ])
    .toArray();

  const topBrands7dP = ordersCol
    .aggregate<{
      _id: string;
      qty: number;
      revenue: number;
    }>([
      { $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } } },
      { $unwind: '$items' },
      { $match: { 'items.kind': 'product' } },
      {
        $group: {
          _id: { $ifNull: ['$items.brand', ''] },
          qty: { $sum: { $ifNull: ['$items.quantity', 0] } },
          revenue: {
            $sum: {
              $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 0] }],
            },
          },
        },
      },
      { $sort: { revenue: -1, qty: -1 } },
      { $limit: 10 },
    ])
    .toArray();

  const dailyOrdersP = ordersCol
    .aggregate<{ _id: string; v: number }>([
      { $match: { createdAt: { $gte: chartStartUtc, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+09:00' } },
          v: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const dailyOrderRevenueP = ordersCol
    .aggregate<{ _id: string; v: number }>([
      { $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: chartStartUtc, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+09:00' } },
          v: { $sum: { $ifNull: ['$totalPrice', 0] } },
        },
      },
    ])
    .toArray();

  // [P0] 패스 만료 임박(30일) 모니터링
  // - status='active' 이면서 expiresAt이 "지금~30일" 구간이면 운영 선제 대응 대상
  // - expiresAt이 Date/string 혼재 가능성에 대비해 타입 방어
  const passesCol = db.collection('service_passes');
  const soon30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nowIsoPass = now.toISOString();
  const soon30Iso = soon30d.toISOString();

  const passExpiringSoonP = passesCol.countDocuments({
    status: 'active',
    expiresAt: { $exists: true },
    $or: [{ expiresAt: { $type: 'date', $gte: now, $lte: soon30d } }, { expiresAt: { $type: 'string', $ne: '', $gte: nowIsoPass, $lte: soon30Iso } }],
  });

  // Top 리스트는 user.name 까지 같이 보여주면 나나 재민이가 바로 알아볼 수 있어서 P0에서도 lookup 포함
  const passExpiringSoonListP = passesCol
    .aggregate<any>([
      {
        $match: {
          status: 'active',
          expiresAt: { $exists: true },
          $or: [{ expiresAt: { $type: 'date', $gte: now, $lte: soon30d } }, { expiresAt: { $type: 'string', $ne: '', $gte: nowIsoPass, $lte: soon30Iso } }],
        },
      },
      { $sort: { expiresAt: 1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          userId: 1,
          orderId: 1,
          packageSize: 1,
          remainingCount: 1,
          expiresAt: 1,
          userName: '$user.name',
          userEmail: '$user.email',
        },
      },
    ])
    .toArray();

  const orderStatusDistP = ordersCol
    .aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: monthStartUtc, $lte: now } } }, { $group: { _id: { $ifNull: ['$status', '미지정'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  const orderPayStatusDistP = ordersCol
    .aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: monthStartUtc, $lte: now } } }, { $group: { _id: { $ifNull: ['$paymentStatus', '결제대기'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  const shippingPendingP = ordersCol.countDocuments({
    paymentStatus: { $in: PAYMENT_PAID_VALUES },
    // 방문 수령은 송장/운송장 개념이 없으므로 제외
    $and: [
      { $or: [{ 'shippingInfo.shippingMethod': { $ne: 'visit' } }, { 'shippingInfo.shippingMethod': { $exists: false } }] },
      {
        $or: [{ 'shippingInfo.invoice.trackingNumber': { $exists: false } }, { 'shippingInfo.invoice.trackingNumber': null }, { 'shippingInfo.invoice.trackingNumber': '' }],
      },
    ],
    // 완료/취소 계열은 제외
    status: { $nin: ['배송완료', '취소', '환불'] },
  });

  const shippingPendingOrdersListP = ordersCol
    .find(
      {
        paymentStatus: { $in: PAYMENT_PAID_VALUES },
        $and: [
          { $or: [{ 'shippingInfo.shippingMethod': { $ne: 'visit' } }, { 'shippingInfo.shippingMethod': { $exists: false } }] },
          {
            $or: [{ 'shippingInfo.invoice.trackingNumber': { $exists: false } }, { 'shippingInfo.invoice.trackingNumber': null }, { 'shippingInfo.invoice.trackingNumber': '' }],
          },
        ],
        status: { $nin: ['배송완료', '취소', '환불'] },
      },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: { _id: 1, createdAt: 1, totalPrice: 1, status: 1, paymentStatus: 1, shippingInfo: 1 },
      },
    )
    .toArray();

  // 결제 대기(24h+) - 일반 주문(Order)
  const paymentPending24hOrdersP = ordersCol.countDocuments({
    paymentStatus: { $in: PAYMENT_PENDING_VALUES },
    createdAt: { $lte: oneDayAgo },

    // 취소 요청으로 넘어간 건은 "취소 요청" 카드에서 관리하므로 여기서는 제외
    'cancelRequest.status': { $nin: CANCEL_REQUESTED_VALUES },
  });

  const paymentPending24hOrdersListP = ordersCol
    .find(
      {
        paymentStatus: { $in: PAYMENT_PENDING_VALUES },
        createdAt: { $lte: oneDayAgo },
        'cancelRequest.status': { $nin: CANCEL_REQUESTED_VALUES },
      },
      {
        sort: { createdAt: 1 }, // 오래된 순(운영 우선순위)
        limit: 10,
        projection: {
          _id: 1,
          userId: 1,
          guest: 1,
          createdAt: 1,
          totalPrice: 1,
          status: 1,
          paymentStatus: 1,
          shippingInfo: 1,
        },
      },
    )
    .toArray();

  const orderCancelRequestsListP = ordersCol
    .find(
      { 'cancelRequest.status': { $in: CANCEL_REQUESTED_VALUES } },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: { _id: 1, createdAt: 1, totalPrice: 1, status: 1, paymentStatus: 1, shippingInfo: 1, cancelRequest: 1 },
      },
    )
    .toArray();

  const orderCancelRequestsP = ordersCol.countDocuments({ 'cancelRequest.status': { $in: CANCEL_REQUESTED_VALUES } });

  const recentOrdersP = ordersCol
    .find(
      {},
      {
        sort: { createdAt: -1 },
        limit: 5,
        projection: { _id: 1, createdAt: 1, totalPrice: 1, status: 1, paymentStatus: 1, shippingInfo: 1 },
      },
    )
    .toArray();

  // ----------------------------- Stringing Applications -----------------------------

  const appsCol = db.collection('stringing_applications');

  const totalAppsP = appsCol.countDocuments({});
  const newApps7dP = appsCol.countDocuments({ createdAt: { $gte: since7d } });

  const paidApps7dP = appsCol.countDocuments({ paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } });
  const revenueApps7dP = appsCol.aggregate<{ _id: null; v: number }>([{ $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } } }, { $group: { _id: null, v: { $sum: { $ifNull: ['$totalPrice', 0] } } } }]).toArray();

  const dailyAppsP = appsCol
    .aggregate<{ _id: string; v: number }>([
      { $match: { createdAt: { $gte: chartStartUtc, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+09:00' } },
          v: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const dailyAppRevenueP = appsCol
    .aggregate<{ _id: string; v: number }>([
      { $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: chartStartUtc, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+09:00' } },
          v: { $sum: { $ifNull: ['$totalPrice', 0] } },
        },
      },
    ])
    .toArray();

  const appStatusDistP = appsCol
    .aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: monthStartUtc, $lte: now } } }, { $group: { _id: { $ifNull: ['$status', '미지정'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  const appCancelRequestsP = appsCol.countDocuments({ 'cancelRequest.status': { $in: CANCEL_REQUESTED_VALUES } });

  const shippingPendingAppsP = appsCol.countDocuments({
    paymentStatus: { $in: PAYMENT_PAID_VALUES },
    $and: [
      {
        $or: [{ 'shippingInfo.invoice.trackingNumber': { $exists: false } }, { 'shippingInfo.invoice.trackingNumber': null }, { 'shippingInfo.invoice.trackingNumber': '' }],
      },
    ],
    status: { $nin: ['교체완료', '취소'] },
  });

  // 결제 대기(24h+) - 교체 서비스 신청(StringingApplication)
  const paymentPending24hAppsP = appsCol.countDocuments({
    paymentStatus: { $in: PAYMENT_PENDING_VALUES },
    createdAt: { $lte: oneDayAgo },
    'cancelRequest.status': { $nin: CANCEL_REQUESTED_VALUES },
  });

  const paymentPending24hAppsListP = appsCol
    .find(
      {
        paymentStatus: { $in: PAYMENT_PENDING_VALUES },
        createdAt: { $lte: oneDayAgo },
        'cancelRequest.status': { $nin: CANCEL_REQUESTED_VALUES },
      },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: {
          _id: 1,
          userId: 1,
          guest: 1,
          createdAt: 1,
          totalPrice: 1,
          status: 1,
          paymentStatus: 1,
          shippingInfo: 1,
        },
      },
    )
    .toArray();

  const shippingPendingAppsListP = appsCol
    .find(
      {
        paymentStatus: { $in: PAYMENT_PAID_VALUES },
        $and: [
          {
            $or: [{ 'shippingInfo.invoice.trackingNumber': { $exists: false } }, { 'shippingInfo.invoice.trackingNumber': null }, { 'shippingInfo.invoice.trackingNumber': '' }],
          },
        ],
        status: { $nin: ['교체완료', '취소'] },
      },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: { _id: 1, createdAt: 1, totalPrice: 1, status: 1, paymentStatus: 1, shippingInfo: 1 },
      },
    )
    .toArray();

  const appCancelRequestsListP = appsCol
    .find(
      { 'cancelRequest.status': { $in: CANCEL_REQUESTED_VALUES } },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: { _id: 1, createdAt: 1, totalPrice: 1, status: 1, paymentStatus: 1, shippingInfo: 1, cancelRequest: 1 },
      },
    )
    .toArray();

  const stringingAgingListP = appsCol
    .find(
      {
        status: { $in: ['검토 중', '접수완료', '작업 중'] },
        createdAt: { $lte: threeDaysAgo },
      },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: { _id: 1, createdAt: 1, totalPrice: 1, status: 1, paymentStatus: 1, shippingInfo: 1 },
      },
    )
    .toArray();

  // 3일 이상 장기 미처리 “건수” (Top 리스트와 동일 조건)
  const stringingAging3dP = appsCol.countDocuments({
    status: { $in: ['검토 중', '접수완료', '작업 중'] },
    createdAt: { $lte: threeDaysAgo },
  });

  const recentAppsP = appsCol
    .find(
      {},
      {
        sort: { createdAt: -1 },
        limit: 5,
        projection: { _id: 1, createdAt: 1, totalPrice: 1, status: 1, paymentStatus: 1, shippingInfo: 1 },
      },
    )
    .toArray();

  // ----------------------------- Rentals -----------------------------

  const rentalsCol = db.collection('rental_orders');

  const totalRentalsP = rentalsCol.countDocuments({});
  const newRentals7dP = rentalsCol.countDocuments({ createdAt: { $gte: since7d } });

  // rental_orders.amount.total에는 '보증금(deposit)'이 포함,
  // 매출(정산) 관점에서는 보증금을 제외하고,
  // 실질 매출 구성(대여료 + 스트링 + 장착/교체 공임)만 집계.

  const paidRentals7dP = rentalsCol.countDocuments({ status: { $in: ['paid', 'out', 'returned'] }, createdAt: { $gte: since7d } });
  const revenueRentals7dP = rentalsCol
    .aggregate<{ _id: null; v: number }>([
      {
        $match: {
          status: { $in: ['paid', 'out', 'returned'] },
          createdAt: { $gte: since7d },
        },
      },
      {
        $group: {
          _id: null,
          v: {
            $sum: {
              $add: [
                { $convert: { input: '$amount.fee', to: 'double', onError: 0, onNull: 0 } },
                { $convert: { input: '$amount.stringPrice', to: 'double', onError: 0, onNull: 0 } },
                { $convert: { input: '$amount.stringingFee', to: 'double', onError: 0, onNull: 0 } },
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const rentalCancelRequestsP = rentalsCol.countDocuments({ 'cancelRequest.status': { $in: CANCEL_REQUESTED_VALUES } });

  const rentalCancelRequestsListP = rentalsCol
    .find(
      { 'cancelRequest.status': { $in: CANCEL_REQUESTED_VALUES } },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: { _id: 1, createdAt: 1, status: 1, amount: 1, fee: 1, deposit: 1, guest: 1, cancelRequest: 1 },
      },
    )
    .toArray();

  // [P0] 대여 연체(기한 초과) 모니터링
  // - status='out' 인데 dueAt이 현재보다 과거라면 "연체"로 봅니다.
  // - dueAt이 Date가 아니라 string(ISO)로 저장된 케이스도 방어합니다(기존 데이터 혼재 대비).
  const overdueRentalsP = rentalsCol.countDocuments({
    status: 'out',
    dueAt: { $exists: true },
    $or: [{ dueAt: { $type: 'date', $lte: now } }, { dueAt: { $type: 'string', $ne: '', $lte: now.toISOString() } }],
  });

  const overdueRentalsListP = rentalsCol
    .find(
      {
        status: 'out',
        dueAt: { $exists: true },
        $or: [{ dueAt: { $type: 'date', $lte: now } }, { dueAt: { $type: 'string', $ne: '', $lte: now.toISOString() } }],
      },
      {
        sort: { dueAt: 1 },
        limit: 10,
        projection: { _id: 1, dueAt: 1, amount: 1, fee: 1, deposit: 1, brand: 1, model: 1, guest: 1, userEmail: 1, userId: 1, shipping: 1, status: 1 },
      },
    )
    .toArray();

  // 반납 임박(48시간 이내) 모니터링
  // - 연체 "이전" 단계에서 미리 잡아서 운영자가 선제 대응할 수 있게 합니다.
  const soon48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const soonIso = soon48h.toISOString();

  const dueSoonRentalsP = rentalsCol.countDocuments({
    status: 'out',
    dueAt: { $exists: true },
    $or: [{ dueAt: { $type: 'date', $gte: now, $lte: soon48h } }, { dueAt: { $type: 'string', $ne: '', $gte: nowIso, $lte: soonIso } }],
  });

  // 결제 대기(24h+) - 대여 주문(Rental) (status=pending + 24h+)
  const paymentPending24hRentalsP = rentalsCol.countDocuments({
    status: 'pending',
    createdAt: { $lte: oneDayAgo },
  });

  const paymentPending24hRentalsListP = rentalsCol
    .find(
      {
        status: 'pending',
        createdAt: { $lte: oneDayAgo },
      },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: {
          _id: 1,
          userId: 1,
          createdAt: 1,
          status: 1,
          amount: 1,
          brand: 1,
          model: 1,
          shipping: 1,
        },
      },
    )
    .toArray();

  const dueSoonRentalsListP = rentalsCol
    .find(
      {
        status: 'out',
        dueAt: { $exists: true },
        $or: [{ dueAt: { $type: 'date', $gte: now, $lte: soon48h } }, { dueAt: { $type: 'string', $ne: '', $gte: nowIso, $lte: soonIso } }],
      },
      {
        sort: { dueAt: 1 },
        limit: 10,
        // 기존 연체 리스트와 동일한 투영 필드를 유지
        projection: { _id: 1, dueAt: 1, amount: 1, fee: 1, deposit: 1, brand: 1, model: 1, guest: 1, userEmail: 1, userId: 1, shipping: 1, status: 1 },
      },
    )
    .toArray();

  const recentRentalsP = rentalsCol.find({}, { sort: { createdAt: -1 }, limit: 5, projection: { _id: 1, createdAt: 1, status: 1, amount: 1, userEmail: 1 } }).toArray();

  // ----------------------------- Packages -----------------------------

  const packageOrdersCol = db.collection('packageOrders');

  const totalPackageOrdersP = packageOrdersCol.countDocuments({});
  const newPackageOrders7dP = packageOrdersCol.countDocuments({ createdAt: { $gte: since7d } });

  const paidPackageOrders7dP = packageOrdersCol.countDocuments({ paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } });
  const revenuePackageOrders7dP = packageOrdersCol
    .aggregate<{ _id: null; v: number }>([{ $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: since7d } } }, { $group: { _id: null, v: { $sum: { $ifNull: ['$totalPrice', 0] } } } }])
    .toArray();

  const dailyPackageRevenueP = packageOrdersCol
    .aggregate<{ _id: string; v: number }>([
      { $match: { paymentStatus: { $in: PAYMENT_PAID_VALUES }, createdAt: { $gte: chartStartUtc, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+09:00' } },
          v: { $sum: { $ifNull: ['$totalPrice', 0] } },
        },
      },
    ])
    .toArray();

  // 결제 대기(24h+) - 패키지 주문(PackageOrder)
  const paymentPending24hPackagesP = packageOrdersCol.countDocuments({
    paymentStatus: { $in: PAYMENT_PENDING_VALUES },
    createdAt: { $lte: oneDayAgo },
  });

  const paymentPending24hPackagesListP = packageOrdersCol
    .find(
      {
        paymentStatus: { $in: PAYMENT_PENDING_VALUES },
        createdAt: { $lte: oneDayAgo },
      },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: {
          _id: 1,
          userId: 1,
          createdAt: 1,
          totalPrice: 1,
          status: 1,
          paymentStatus: 1,
          userSnapshot: 1, // 이름 표시 안정화
        },
      },
    )
    .toArray();

  // ----------------------------- Reviews -----------------------------

  const reviewsCol = db.collection('reviews');

  // 7일 신규 리뷰
  const newReviews7dP = reviewsCol.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: since7d } });

  // 전체 리뷰 지표 (※ /api/admin/reviews/metrics 와 동일한 판별 로직을 최대한 유지)
  const reviewsAggP = reviewsCol
    .aggregate<{
      _id: null;
      total: number;
      avg: number;
      five: number;
      four: number;
      three: number;
      two: number;
      one: number;
      product: number;
      service: number;
    }>([
      { $match: { isDeleted: { $ne: true } } },
      {
        $addFields: {
          // 문자열/객체형/레거시 키까지 폭넓게 인식
          _pidStr: { $toString: { $ifNull: ['$productId', '$product_id'] } },
          hasProductId: {
            $or: [
              { $ne: [{ $ifNull: ['$productId', null] }, null] },
              { $ne: [{ $ifNull: ['$product_id', null] }, null] },
              // 24자 헥사 문자열도 유효한 productId로 간주
              { $regexMatch: { input: { $toString: { $ifNull: ['$productId', '$product_id'] } }, regex: /^[a-fA-F0-9]{24}$/ } },
            ],
          },
          hasServiceMarker: {
            $or: [{ $ne: [{ $ifNull: ['$serviceApplicationId', null] }, null] }, { $in: ['$service', ['stringing']] }],
          },
          // type이 명시되고 값이 정상일 때만 우선
          typeValid: { $in: ['$type', ['product', 'service']] },
        },
      },
      {
        $addFields: {
          resolvedType: {
            $cond: [
              '$typeValid',
              '$type',
              {
                $cond: [
                  '$hasProductId',
                  'product',
                  { $cond: ['$hasServiceMarker', 'service', 'service'] }, // 기본값은 service
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avg: { $avg: '$rating' },
          five: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          four: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          three: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          two: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          one: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          product: { $sum: { $cond: [{ $eq: ['$resolvedType', 'product'] }, 1, 0] } },
          service: { $sum: { $cond: [{ $eq: ['$resolvedType', 'service'] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  // 일별 리뷰 작성 수(그래프용)
  const dailyReviewsP = reviewsCol
    .aggregate<{ _id: string; v: number }>([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: chartStartUtc, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+09:00' } },
          v: { $sum: 1 },
        },
      },
    ])
    .toArray();

  // ----------------------------- Points -----------------------------

  const pointsCol = db.collection('point_transactions');

  const pointsIssued7dP = pointsCol.aggregate<{ _id: null; v: number }>([{ $match: { createdAt: { $gte: since7d }, amount: { $gt: 0 } } }, { $group: { _id: null, v: { $sum: { $ifNull: ['$amount', 0] } } } }]).toArray();

  const pointsSpent7dP = pointsCol.aggregate<{ _id: null; v: number }>([{ $match: { createdAt: { $gte: since7d }, amount: { $lt: 0 } } }, { $group: { _id: null, v: { $sum: { $multiply: [{ $ifNull: ['$amount', 0] }, -1] } } } }]).toArray();

  // ----------------------------- Community -----------------------------

  const postsCol = db.collection('community_posts');
  const commentsCol = db.collection('community_comments');
  const reportsCol = db.collection('community_reports');

  const posts7dP = postsCol.countDocuments({ createdAt: { $gte: since7d } });
  const comments7dP = commentsCol.countDocuments({ createdAt: { $gte: since7d } });
  const pendingReportsP = reportsCol.countDocuments({ status: 'pending' });

  const recentReportsP = reportsCol.find({}, { sort: { createdAt: -1 }, limit: 5, projection: { _id: 1, createdAt: 1, reason: 1, postId: 1, commentId: 1 } }).toArray();

  // ----------------------------- Inventory -----------------------------

  const productsCol = db.collection('products');
  const racketsCol = db.collection('used_rackets');

  const lowStockProductsP = productsCol.countDocuments({
    'inventory.stock': { $gt: 0 },
    $expr: { $lte: ['$inventory.stock', '$inventory.lowStock'] },
  });
  const outOfStockProductsP = productsCol.countDocuments({ 'inventory.stock': { $lte: 0 } });
  const inactiveRacketsP = racketsCol.countDocuments({ status: { $in: ['inactive'] } });

  const lowStockListP = productsCol
    .find(
      {
        isDeleted: { $ne: true },
        'inventory.stock': { $gt: 0 },
        'inventory.lowStock': { $ne: null },
        $expr: { $lte: ['$inventory.stock', '$inventory.lowStock'] },
      },
      { projection: { _id: 1, name: 1, brand: 1, inventory: 1, updatedAt: 1, createdAt: 1 } },
    )
    .sort({ 'inventory.stock': 1, updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(8)
    .toArray();

  const outOfStockListP = productsCol
    .find({ isDeleted: { $ne: true }, 'inventory.stock': { $lte: 0 } }, { projection: { _id: 1, name: 1, brand: 1, inventory: 1, updatedAt: 1, createdAt: 1 } })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(8)
    .toArray();

  // ----------------------------- Notifications Outbox -----------------------------

  const outboxCol = db.collection('notifications_outbox');
  const outboxQueuedP = outboxCol.countDocuments({ status: 'queued' });

  // 실패 건은 “즉시 조치 필요”라 queued와 분리해서 카운트
  const outboxFailedP = outboxCol.countDocuments({ status: 'failed' });

  const outboxBacklogListP = outboxCol
    .find(
      { status: { $in: ['queued', 'failed'] } },
      {
        sort: { createdAt: 1 },
        limit: 10,
        projection: { _id: 1, createdAt: 1, status: 1, eventType: 1, retries: 1, error: 1, rendered: 1 },
      },
    )
    .toArray();

  // ----------------------------- 실행(병렬) -----------------------------

  const [
    totalUsers,
    newUsers7d,
    activeUsers7d,
    usersByProvider,
    dailySignups,

    totalOrders,
    newOrders7d,
    paidOrders7d,
    revenueOrders7dRows,
    revenueOrdersMonthRows,
    topProducts7dRows,
    topBrands7dRows,
    dailyOrders,
    dailyOrderRevenue,
    orderStatusDistRows,
    orderPayStatusDistRows,
    shippingPending,
    orderCancelRequests,
    recentOrders,

    totalApps,
    newApps7d,
    paidApps7d,
    revenueApps7dRows,
    dailyApps,
    dailyAppRevenue,
    appStatusDistRows,
    appCancelRequests,
    recentApps,

    totalRentals,
    newRentals7d,
    paidRentals7d,
    revenueRentals7dRows,
    rentalCancelRequests,
    overdueRentals,
    dueSoonRentals,
    recentRentals,

    totalPackageOrders,
    newPackageOrders7d,
    paidPackageOrders7d,
    revenuePackageOrders7dRows,
    dailyPackageRevenue,
    passExpiringSoon,
    passExpiringSoonListRaw,

    newReviews7d,
    reviewsAggRows,
    dailyReviews,

    pointsIssued7dRows,
    pointsSpent7dRows,

    posts7d,
    comments7d,
    pendingReports,
    recentReports,

    lowStockProducts,
    outOfStockProducts,
    inactiveRackets,

    lowStockListDocs,
    outOfStockListDocs,

    outboxQueued,
    outboxFailed,

    // 결제 대기(24h+)
    paymentPending24hOrders,
    paymentPending24hOrdersList,
    paymentPending24hApps,
    paymentPending24hAppsList,
    paymentPending24hRentals,
    paymentPending24hRentalsList,
    paymentPending24hPackages,
    paymentPending24hPackagesList,

    shippingPendingOrdersList,
    shippingPendingApps,
    shippingPendingAppsList,
    orderCancelRequestsList,
    appCancelRequestsList,
    rentalCancelRequestsList,
    overdueRentalsList,
    dueSoonRentalsList,
    stringingAgingList,
    stringingAging3d,
    outboxBacklogList,
  ] = await Promise.all([
    totalUsersP,
    newUsers7dP,
    activeUsers7dP,
    usersByProviderP,
    dailySignupsP,

    totalOrdersP,
    newOrders7dP,
    paidOrders7dP,
    revenueOrders7dP,
    revenueOrdersMonthP,
    topProducts7dP,
    topBrands7dP,
    dailyOrdersP,
    dailyOrderRevenueP,
    orderStatusDistP,
    orderPayStatusDistP,
    shippingPendingP,
    orderCancelRequestsP,
    recentOrdersP,

    totalAppsP,
    newApps7dP,
    paidApps7dP,
    revenueApps7dP,
    dailyAppsP,
    dailyAppRevenueP,
    appStatusDistP,
    appCancelRequestsP,
    recentAppsP,

    totalRentalsP,
    newRentals7dP,
    paidRentals7dP,
    revenueRentals7dP,
    rentalCancelRequestsP,
    overdueRentalsP,
    dueSoonRentalsP,
    recentRentalsP,

    totalPackageOrdersP,
    newPackageOrders7dP,
    paidPackageOrders7dP,
    revenuePackageOrders7dP,
    dailyPackageRevenueP,
    passExpiringSoonP,
    passExpiringSoonListP,

    newReviews7dP,
    reviewsAggP,
    dailyReviewsP,

    pointsIssued7dP,
    pointsSpent7dP,

    posts7dP,
    comments7dP,
    pendingReportsP,
    recentReportsP,

    lowStockProductsP,
    outOfStockProductsP,
    inactiveRacketsP,

    lowStockListP,
    outOfStockListP,

    outboxQueuedP,
    outboxFailedP,

    // 결제 대기(24h+)
    paymentPending24hOrdersP,
    paymentPending24hOrdersListP,
    paymentPending24hAppsP,
    paymentPending24hAppsListP,
    paymentPending24hRentalsP,
    paymentPending24hRentalsListP,
    paymentPending24hPackagesP,
    paymentPending24hPackagesListP,

    shippingPendingOrdersListP,
    shippingPendingAppsP,
    shippingPendingAppsListP,
    orderCancelRequestsListP,
    appCancelRequestsListP,
    rentalCancelRequestsListP,
    overdueRentalsListP,
    dueSoonRentalsListP,
    stringingAgingListP,
    stringingAging3dP,
    outboxBacklogListP,
  ]);

  const revenueOrders7d = Number(revenueOrders7dRows?.[0]?.v || 0);
  const revenueOrdersMonth = Number(revenueOrdersMonthRows?.[0]?.v || 0);

  const revenueApps7d = Number(revenueApps7dRows?.[0]?.v || 0);
  const revenueRentals7d = Number(revenueRentals7dRows?.[0]?.v || 0);
  const revenuePackageOrders7d = Number(revenuePackageOrders7dRows?.[0]?.v || 0);

  const pointsIssued7d = Number(pointsIssued7dRows?.[0]?.v || 0);
  const pointsSpent7d = Number(pointsSpent7dRows?.[0]?.v || 0);

  const reviewsAgg = (reviewsAggRows as Array<any>)?.[0];
  const totalReviews = Number(reviewsAgg?.total || 0);
  const avgReview = Number(reviewsAgg?.avg || 0);
  const fiveReviews = Number(reviewsAgg?.five || 0);
  const reviewsByType = {
    product: Number(reviewsAgg?.product || 0),
    service: Number(reviewsAgg?.service || 0),
  };
  const reviewsByRating = {
    one: Number(reviewsAgg?.one || 0),
    two: Number(reviewsAgg?.two || 0),
    three: Number(reviewsAgg?.three || 0),
    four: Number(reviewsAgg?.four || 0),
    five: Number(reviewsAgg?.five || 0),
  };

  const orderRevMap = rowsToMap(dailyOrderRevenue);
  const appRevMap = rowsToMap(dailyAppRevenue);
  const packageRevMap = rowsToMap(dailyPackageRevenue);

  const dailyRevenueBySource = ymds.map((date) => {
    const orders = Number(orderRevMap?.[date] || 0);
    const applications = Number(appRevMap?.[date] || 0);
    const packages = Number(packageRevMap?.[date] || 0);
    const total = orders + applications + packages;
    return { date, orders, applications, packages, total };
  });

  const dailyRevenue = dailyRevenueBySource.map((d : any) => ({ date: d.date, value: d.total }));

  const toIso = (v: any) => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : new Date().toISOString());

  const pickName = (doc: any) => String(doc?.shippingInfo?.name || doc?.shippingInfo?.receiverName || doc?.guest?.name || '고객');

  const pickOutboxTo = (doc: any) => (doc?.rendered?.email?.to as string) || (doc?.rendered?.sms?.to as string) || null;

  const calcAgeDays = (createdAt: any) => {
    const t = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
    return Math.max(0, Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000)));
  };

  const toIsoAny = (v: any) => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : new Date().toISOString());
  const pickRentalName = (doc: any) => {
    // 대여는 shippingInfo가 없을 수 있으므로, 라켓(브랜드/모델) + 고객 식별자를 함께 보여줍니다.
    const racket = [doc?.brand, doc?.model].filter(Boolean).join(' ');
    const who = String(
      doc?.guest?.name || // 비회원/게스트 이름(있으면)
        doc?.shipping?.name || //  대여 문서에 있는 수령인/신청자 이름
        doc?.userEmail || // 저장돼 있으면 이메일
        (doc?.userId ? `회원#${String(doc.userId).slice(-6)}` : '') ||
        '고객',
    );
    return racket ? `${racket} · ${who}` : who;
  };
  const calcOverdueDays = (dueAt: any) => {
    const t = dueAt instanceof Date ? dueAt.getTime() : new Date(dueAt).getTime();
    return Number.isFinite(t) ? Math.max(0, Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000))) : 0;
  };

  const calcDueInHours = (dueAt: any) => {
    const t = dueAt instanceof Date ? dueAt.getTime() : new Date(dueAt).getTime();
    // ceil: 1분 남아도 "1시간"처럼 보이게(운영자가 놓치지 않도록)
    return Number.isFinite(t) ? Math.max(0, Math.ceil((t - now.getTime()) / (60 * 60 * 1000))) : 0;
  };

  // 목록 변환/통합
  const cancelRequests = [
    ...(orderCancelRequestsList as any[]).map((d : any) => ({
      kind: 'order' as const,
      id: String(d?._id),
      createdAt: toIso(d?.createdAt),
      name: pickName(d),
      amount: Number(d?.totalPrice || 0),
      status: String(d?.status || ''),
      paymentStatus: normalizePaymentStatusLabel(d?.paymentStatus),
      href: `/admin/orders/${String(d?._id)}`,
    })),
    ...(appCancelRequestsList as any[]).map((d : any) => ({
      kind: 'application' as const,
      id: String(d?._id),
      createdAt: toIso(d?.createdAt),
      name: pickName(d),
      amount: Number(d?.totalPrice || 0),
      status: String(d?.status || ''),
      paymentStatus: normalizePaymentStatusLabel(d?.paymentStatus),
      href: `/admin/applications/stringing/${String(d?._id)}`,
    })),
    ...(rentalCancelRequestsList as any[]).map((d : any) => ({
      kind: 'rental' as const,
      id: String(d?._id),
      createdAt: toIso(d?.createdAt),
      name: String(d?.guest?.name || '고객'),
      amount: Number(d?.amount?.total || Number(d?.fee || 0) + Number(d?.deposit || 0)),
      status: String(d?.status || ''),
      href: `/admin/rentals/${String(d?._id)}`,
    })),
  ]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 10);

  const shippingPendingList = [
    ...(shippingPendingOrdersList as any[]).map((d : any) => ({
      kind: 'order' as const,
      id: String(d?._id),
      createdAt: toIso(d?.createdAt),
      name: pickName(d),
      amount: Number(d?.totalPrice || 0),
      status: String(d?.status || ''),
      paymentStatus: normalizePaymentStatusLabel(d?.paymentStatus),
      href: `/admin/orders/${String(d?._id)}/shipping-update`,
    })),
    ...(shippingPendingAppsList as any[]).map((d : any) => ({
      kind: 'application' as const,
      id: String(d?._id),
      createdAt: toIso(d?.createdAt),
      name: pickName(d),
      amount: Number(d?.totalPrice || 0),
      status: String(d?.status || ''),
      paymentStatus: normalizePaymentStatusLabel(d?.paymentStatus),
      href: `/admin/applications/stringing/${String(d?._id)}/shipping-update`,
    })),
  ]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 10);

  // 결제 대기(24h+) 총합 (주문 + 신청 + 대여 + 패키지)
  const paymentPending24h = paymentPending24hOrders + paymentPending24hApps + paymentPending24hRentals + paymentPending24hPackages;

  // createdAt → "몇 시간 지났는지" 계산 (대시보드 뱃지용)
  const hoursAgo = (createdAtIso: string) => {
    const t = Date.parse(createdAtIso);
    if (!Number.isFinite(t)) return 0;
    return Math.max(0, Math.floor((now.getTime() - t) / (60 * 60 * 1000)));
  };

  // 결제 대기(24h+) Top 리스트 (오래된 순)
  const paymentPending24hList = [
    ...(paymentPending24hOrdersList as any[]).map((d : any) => ({
      kind: 'order' as const,
      id: String(d._id),
      createdAt: toIsoAny(d.createdAt),
      name: pickName(d),
      amount: Number(d.totalPrice ?? 0),
      status: String(d.status ?? ''),
      href: `/admin/orders/${String(d._id)}`,
      hoursAgo: hoursAgo(toIsoAny(d.createdAt)),
    })),
    ...(paymentPending24hAppsList as any[]).map((d : any) => ({
      kind: 'application' as const,
      id: String(d._id),
      createdAt: toIsoAny(d.createdAt),
      name: pickName(d),
      amount: Number(d.totalPrice ?? 0),
      status: String(d.status ?? ''),
      href: `/admin/applications/stringing/${String(d._id)}`,
      hoursAgo: hoursAgo(toIsoAny(d.createdAt)),
    })),
    ...(paymentPending24hPackagesList as any[]).map((d : any) => ({
      kind: 'package' as const,
      id: String(d._id),
      createdAt: toIsoAny(d.createdAt),
      name: String(d?.userSnapshot?.name ?? ''),
      amount: Number(d.totalPrice ?? 0),
      status: String(d.status ?? ''),
      href: `/admin/packages/${String(d._id)}`,
      hoursAgo: hoursAgo(toIsoAny(d.createdAt)),
    })),
    ...(paymentPending24hRentalsList as any[]).map((d : any) => ({
      kind: 'rental' as const,
      id: String(d._id),
      createdAt: toIsoAny(d.createdAt),
      name: pickRentalName(d),
      amount: Number(d?.amount?.total ?? 0),
      status: String(d.status ?? ''),
      href: `/admin/rentals/${String(d._id)}`,
      hoursAgo: hoursAgo(toIsoAny(d.createdAt)),
    })),
  ]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 10);

  const rentalOverdueList = (overdueRentalsList as any[]).map((d : any) => ({
    id: String(d?._id),
    dueAt: toIsoAny(d?.dueAt),
    name: pickRentalName(d),
    amount: Number(d?.amount?.total || Number(d?.fee || 0) + Number(d?.deposit || 0)),
    overdueDays: calcOverdueDays(d?.dueAt),
    href: `/admin/rentals/${String(d?._id)}`,
  }));

  const rentalDueSoonList = (dueSoonRentalsList as any[]).map((d : any) => ({
    id: String(d?._id),
    dueAt: toIsoAny(d?.dueAt),
    name: pickRentalName(d),
    amount: Number(d?.amount?.total || Number(d?.fee || 0) + Number(d?.deposit || 0)),
    dueInHours: calcDueInHours(d?.dueAt),
    href: `/admin/rentals/${String(d?._id)}`,
  }));

  // expiresAt → daysLeft 계산 (운영 시 “n일 남음”이 가장 직관적)
  const calcDaysLeft = (expiresAt: any) => {
    const t = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
    return Number.isFinite(t) ? Math.max(0, Math.ceil((t - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;
  };
  const pickPassName = (doc: any) => {
    const who = String(doc?.userName || doc?.userEmail || (doc?.userId ? `회원#${String(doc.userId).slice(-6)}` : '') || '고객');
    const size = Number(doc?.packageSize || 0);
    const label = size > 0 ? `${size}회권` : '패스';
    return `${who} · ${label}`;
  };
  const passExpiringSoonList = (passExpiringSoonListRaw as any[]).map((d : any) => ({
    id: String(d?._id),
    expiresAt: toIsoAny(d?.expiresAt),
    name: pickPassName(d),
    remainingCount: Number(d?.remainingCount || 0),
    daysLeft: calcDaysLeft(d?.expiresAt),
    href: d?.orderId ? `/admin/packages/${String(d.orderId)}` : '/admin/packages',
  }));

  const stringingAging = (stringingAgingList as any[]).map((d : any) => ({
    id: String(d?._id),
    createdAt: toIso(d?.createdAt),
    name: pickName(d),
    status: String(d?.status || ''),
    paymentStatus: normalizePaymentStatusLabel(d?.paymentStatus),
    totalPrice: Number(d?.totalPrice || 0),
    ageDays: calcAgeDays(d?.createdAt),
    href: `/admin/applications/stringing/${String(d?._id)}`,
  }));

  const outboxBacklog = (outboxBacklogList as any[]).map((d : any) => ({
    id: String(d?._id),
    createdAt: toIso(d?.createdAt),
    status: (d?.status || 'queued') as 'queued' | 'failed' | 'sent',
    eventType: String(d?.eventType || ''),
    to: pickOutboxTo(d),
    retries: Number(d?.retries || 0),
    error: d?.error ? String(d.error).slice(0, 140) : null,
  }));

  // dist 라벨 merge:
  // - DB에 결제상태가 'paid'/'pending' 또는 '결제완료'/'결제대기'처럼 섞여 있어도
  //   대시보드 분포에서는 한 라벨로 합쳐 보이게 합니다.
  function normalizePaymentStatusLabel(v: any) {
    const raw = String(v ?? '').trim();
    const lower = raw.toLowerCase();

    // NOTE: PAYMENT_*_VALUES는 이미 'paid/pending' + '결제완료/결제대기'를 포함하도록 구성되어 있음
    if (PAYMENT_PAID_VALUES.some((x) => String(x).toLowerCase() === lower)) return '결제완료';
    if (PAYMENT_PENDING_VALUES.some((x) => String(x).toLowerCase() === lower)) return '결제대기';

    return raw || '기타';
  }

  const mergeDistByLabel = (rows: any[], normalize: (v: any) => string) => {
    const acc = new Map<string, number>();
    for (const r of rows ?? []) {
      const label = normalize(r?._id);
      const count = Number(r?.count || 0);
      acc.set(label, (acc.get(label) ?? 0) + count);
    }
    return Array.from(acc.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const orderPaymentStatusDist = mergeDistByLabel(orderPayStatusDistRows as any[], normalizePaymentStatusLabel);

  // 정산 스냅샷 누락 방지:
  // - 운영자가 월말/월초에 정산 페이지를 놓치면 "스냅샷이 없는 달"이 생기기 쉬움
  // - 대시보드에서 이번달/지난달 스냅샷 생성 여부를 바로 보여주기 위해 함께 내려줍니다.
  const currentYyyymm = fmtYyyymmKst(now);
  const prevYyyymm = shiftYyyymm(currentYyyymm, -1);

  const [currSnap, prevSnap, latestSnap] = await Promise.all([
    db.collection('settlements').findOne({ yyyymm: currentYyyymm }, { projection: { _id: 1 } }),
    db.collection('settlements').findOne({ yyyymm: prevYyyymm }, { projection: { _id: 1 } }),
    db.collection('settlements').findOne({}, { sort: { yyyymm: -1 }, projection: { yyyymm: 1, lastGeneratedAt: 1, lastGeneratedBy: 1 } }),
  ]);

  const resp: DashboardMetrics = {
    generatedAt: now.toISOString(),

    series: {
      days: CHART_DAYS,
      fromYmd: toYmd(chartStartKst),
      toYmd: toYmd(chartEndKst),

      dailyRevenue,
      dailyRevenueBySource,
      dailyOrders: mergeSeries(ymds, rowsToMap(dailyOrders)),
      dailyApplications: mergeSeries(ymds, rowsToMap(dailyApps)),
      dailySignups: mergeSeries(ymds, rowsToMap(dailySignups)),
      dailyReviews: mergeSeries(ymds, rowsToMap(dailyReviews)),
    },

    kpi: {
      users: {
        total: totalUsers,
        delta7d: newUsers7d,
        active7d: activeUsers7d,
        byProvider: usersByProvider,
      },

      orders: {
        total: totalOrders,
        delta7d: newOrders7d,
        paid7d: paidOrders7d,
        revenue7d: revenueOrders7d,
        aov7d: paidOrders7d > 0 ? Math.round(revenueOrders7d / paidOrders7d) : 0,
      },

      applications: {
        total: totalApps,
        delta7d: newApps7d,
        paid7d: paidApps7d,
        revenue7d: revenueApps7d,
      },

      rentals: {
        total: totalRentals,
        delta7d: newRentals7d,
        paid7d: paidRentals7d,
        revenue7d: revenueRentals7d,
      },

      packages: {
        total: totalPackageOrders,
        delta7d: newPackageOrders7d,
        paid7d: paidPackageOrders7d,
        revenue7d: revenuePackageOrders7d,
      },

      reviews: {
        total: totalReviews,
        delta7d: newReviews7d,
        avg: avgReview,
        five: fiveReviews,
        byType: reviewsByType,
        byRating: reviewsByRating,
      },

      points: {
        issued7d: pointsIssued7d,
        spent7d: pointsSpent7d,
      },

      community: {
        posts7d,
        comments7d,
        pendingReports,
      },

      inventory: {
        lowStockProducts,
        outOfStockProducts,
        inactiveRackets,
      },

      queue: {
        cancelRequests: Number(orderCancelRequests || 0) + Number(rentalCancelRequests || 0) + Number(appCancelRequests || 0),
        shippingPending: Number(shippingPending || 0) + Number(shippingPendingApps || 0),
        paymentPending24h,
        rentalOverdue: Number(overdueRentals || 0),
        rentalDueSoon: Number(dueSoonRentals || 0),
        passExpiringSoon: Number(passExpiringSoon || 0),
        outboxQueued,
        outboxFailed,
        stringingAging3d: stringingAging3d,
      },
    },

    dist: {
      orderStatus: orderStatusDistRows.map((r : any) => ({ label: String(r._id), count: Number(r.count || 0) })),
      orderPaymentStatus: orderPaymentStatusDist,
      applicationStatus: appStatusDistRows.map((r : any) => ({ label: String(r._id), count: Number(r.count || 0) })),
    },

    inventoryList: {
      lowStock: (lowStockListDocs as Array<any>).map((d : any) => ({
        id: String(d?._id),
        name: String(d?.name || ''),
        brand: String(d?.brand || ''),
        stock: Number(d?.inventory?.stock || 0),
        lowStock: d?.inventory?.lowStock === null || d?.inventory?.lowStock === undefined ? null : Number(d?.inventory?.lowStock),
      })),
      outOfStock: (outOfStockListDocs as Array<any>).map((d : any) => ({
        id: String(d?._id),
        name: String(d?.name || ''),
        brand: String(d?.brand || ''),
        stock: Number(d?.inventory?.stock || 0),
      })),
    },

    top: {
      products7d: (topProducts7dRows as Array<any>).map((r : any) => ({
        productId: String(r?._id),
        name: String(r?.name || ''),
        brand: String(r?.brand || ''),
        qty: Number(r?.qty || 0),
        revenue: Number(r?.revenue || 0),
      })),
      brands7d: (topBrands7dRows as Array<any>).map((r : any) => ({
        brand: String(r?._id || ''),
        qty: Number(r?.qty || 0),
        revenue: Number(r?.revenue || 0),
      })),
    },

    // 운영 큐 상세(Top lists)
    // - 프론트에서는 data.queueDetails.* 로 접근하고,
    // - kpi.queue 는 카드 상단의 "건수" 요약에만 사용합니다.
    queueDetails: {
      cancelRequests,
      shippingPending: shippingPendingList,
      rentalOverdue: rentalOverdueList,
      rentalDueSoon: rentalDueSoonList,
      passExpiringSoon: passExpiringSoonList,
      stringingAging,
      outboxBacklog: outboxBacklogList.map((d : any) => ({
        id: String(d._id),
        href: `/admin/notifications/outbox/${String(d._id)}`,
        createdAt: d?.createdAt instanceof Date ? d.createdAt.toISOString() : typeof d?.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
        status: (d?.status as any) || 'queued',
        eventType: String(d?.eventType || ''),
        to: pickOutboxTo(d),
        retries: Number(d?.retries || 0),
        error: d?.error ? String(d.error) : d?.lastError ? String(d.lastError) : null,
      })),
      paymentPending24h: paymentPending24hList,
    },

    settlements: {
      currentYyyymm,
      prevYyyymm,
      hasCurrentSnapshot: Boolean(currSnap),
      hasPrevSnapshot: Boolean(prevSnap),
      latest: latestSnap
        ? {
            yyyymm: String(latestSnap.yyyymm),
            lastGeneratedAt: latestSnap.lastGeneratedAt ? new Date(latestSnap.lastGeneratedAt).toISOString() : null,
            lastGeneratedBy: latestSnap.lastGeneratedBy ? String(latestSnap.lastGeneratedBy) : null,
          }
        : null,
    },

    recent: {
      orders: (recentOrders as Array<any>).map((d : any) => ({
        id: String(d?._id),
        createdAt: d?.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
        name: String(d?.shippingInfo?.name || d?.shippingInfo?.receiverName || '고객'),
        totalPrice: Number(d?.totalPrice || 0),
        status: String(d?.status || '대기중'),
        paymentStatus: normalizePaymentStatusLabel(d?.paymentStatus || '결제대기'),
      })),
      applications: (recentApps as Array<any>).map((d : any) => ({
        id: String(d?._id),
        createdAt: d?.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
        name: String(d?.shippingInfo?.name || d?.shippingInfo?.receiverName || '고객'),
        totalPrice: Number(d?.totalPrice || 0),
        status: String(d?.status || '접수완료'),
        paymentStatus: normalizePaymentStatusLabel(d?.paymentStatus || '결제대기'),
      })),
      rentals: (recentRentals as Array<any>).map((d : any) => ({
        id: String(d?._id),
        createdAt: d?.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
        name: String(d?.userEmail || '고객'),
        total: Number(d?.amount?.total || 0),
        status: String(d?.status || 'pending'),
      })),
      reports: (recentReports as Array<any>).map((d : any) => ({
        id: String(d?._id),
        createdAt: d?.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
        kind: d?.commentId ? 'comment' : 'post',
        reason: String(d?.reason || '').slice(0, 120),
      })),
    },
  };

  // 캐시: 대시보드는 "실시간"에 가깝게 보고 싶지만, 초당 단위는 필요 없어서 10초만 캐싱합니다.
  return { payload: resp, headers: { 'Cache-Control': 'private, max-age=0, s-maxage=10' } };
}
