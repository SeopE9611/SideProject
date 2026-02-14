export type DashboardMetrics = {
  generatedAt: string;
  series: {
    days: number;
    fromYmd: string;
    toYmd: string;
    dailyRevenue: Array<{ date: string; value: number }>;
    dailyRevenueBySource: Array<{ date: string; orders: number; applications: number; packages: number; total: number }>;
    dailyOrders: Array<{ date: string; value: number }>;
    dailyApplications: Array<{ date: string; value: number }>;
    dailySignups: Array<{ date: string; value: number }>;
    dailyReviews: Array<{ date: string; value: number }>;
  };
  kpi: {
    users: { total: number; delta7d: number; active7d: number; byProvider: { local: number; kakao: number; naver: number } };
    orders: { total: number; delta7d: number; paid7d: number; revenue7d: number; aov7d: number };
    applications: { total: number; delta7d: number; paid7d: number; revenue7d: number };
    rentals: { total: number; delta7d: number; paid7d: number; revenue7d: number };
    packages: { total: number; delta7d: number; paid7d: number; revenue7d: number };
    reviews: {
      total: number;
      delta7d: number;
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
    orderStatus: Array<{ label: string; count: number }>;
    orderPaymentStatus: Array<{ label: string; count: number }>;
    applicationStatus: Array<{ label: string; count: number }>;
  };
  inventoryList: {
    lowStock: Array<{ id: string; name: string; brand: string; stock: number; lowStock: number | null }>;
    outOfStock: Array<{ id: string; name: string; brand: string; stock: number }>;
  };
  top: {
    products7d: Array<{ productId: string; name: string; brand: string; qty: number; revenue: number }>;
    brands7d: Array<{ brand: string; qty: number; revenue: number }>;
  };
  recent: {
    orders: Array<{ id: string; createdAt: string; name: string; totalPrice: number; status: string; paymentStatus: string }>;
    applications: Array<{ id: string; createdAt: string; name: string; totalPrice: number; status: string; paymentStatus: string }>;
    rentals: Array<{ id: string; createdAt: string; name: string; total: number; status: string }>;
    reports: Array<{ id: string; createdAt: string; kind: 'post' | 'comment'; reason: string }>;
  };
  queueDetails: {
    cancelRequests: Array<{ kind: 'order' | 'application' | 'rental'; id: string; createdAt: string; name: string; amount: number; status: string; paymentStatus?: string; href: string }>;
    shippingPending: Array<{ kind: 'order' | 'application'; id: string; createdAt: string; name: string; amount: number; status: string; paymentStatus: string; href: string }>;
    paymentPending24h: Array<{ kind: 'order' | 'application' | 'rental' | 'package'; id: string; createdAt: string; name: string; amount: number; status: string; href: string; hoursAgo: number }>;
    rentalOverdue: Array<{ id: string; dueAt: string; name: string; amount: number; overdueDays: number; href: string }>;
    rentalDueSoon: Array<{ id: string; dueAt: string; name: string; amount: number; dueInHours: number; href: string }>;
    passExpiringSoon: Array<{ id: string; expiresAt: string; name: string; remainingCount: number; daysLeft: number; href: string }>;
    stringingAging: Array<{ id: string; createdAt: string; name: string; status: string; paymentStatus: string; totalPrice: number; ageDays: number; href: string }>;
    outboxBacklog: Array<{ id: string; href: string; createdAt: string; status: 'queued' | 'failed' | 'sent'; eventType: string; to: string | null; retries: number; error: string | null }>;
  };
  settlements: {
    currentYyyymm: string;
    prevYyyymm: string;
    hasCurrentSnapshot: boolean;
    hasPrevSnapshot: boolean;
    latest: null | { yyyymm: string; lastGeneratedAt: string | null; lastGeneratedBy: string | null };
  };
};
