import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";
import { buildOnlinePaymentEvents } from "@/app/api/settlements/_lib/paymentEvents";
import { enforceAdminRateLimit } from "@/lib/admin/adminRateLimit";
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from "@/lib/admin/adminEndpointCostPolicy";
import { buildOfflineSettlementReference } from "@/app/api/settlements/_lib/offlineReference";

function withDeprecation(res: NextResponse) {
  res.headers.set("Deprecation", "true");
  res.headers.set("Sunset", "Wed, 31 Dec 2026 14:59:59 GMT");
  res.headers.set("Link", '</api/admin/settlements/live>; rel="successor-version"');
  return res;
}

// 쿼리: /api/settlements/live?from=YYYY-MM-DD&to=YYYY-MM-DD (KST 기준)
export async function GET(req: Request) {
  try {
    // 1) 관리자 인증 (정산 데이터는 매출/운영 정보이므로 반드시 관리자만 조회)
    const g = await requireAdmin(req);
    if (!g.ok) return withDeprecation(g.res);
    const limited = await enforceAdminRateLimit(
      req,
      g.db,
      String(g.admin._id),
      ADMIN_EXPENSIVE_ENDPOINT_POLICIES.settlementsRead,
    );
    if (limited) return withDeprecation(limited);

    const db = g.db;

    const url = new URL(req.url);
    const from = url.searchParams.get("from"); // yyyy-mm-dd
    const to = url.searchParams.get("to"); // yyyy-mm-dd

    if (!from || !to) {
      return withDeprecation(
        NextResponse.json({ error: "from,to 쿼리 필요(yyyy-mm-dd)" }, { status: 400 }),
      );
    }
    if (new Date(from) > new Date(to)) {
      return withDeprecation(
        NextResponse.json({ error: "시작일이 종료일보다 늦습니다." }, { status: 400 }),
      );
    }
    // KST 기준으로 하루 경계 잡기 → UTC로 변환
    function kstDayStartUtc(ymd: string) {
      // ymd: 'YYYY-MM-DD'
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, -9, 0, 0)); // KST 00:00 → UTC
    }
    function kstDayEndExclusiveUtc(ymd: string) {
      // 익일 KST 00:00 → UTC (Date.UTC는 날짜 넘침을 자동 처리)
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d + 1, -9, 0, 0));
    }

    const start = kstDayStartUtc(from);
    const endExclusive = kstDayEndExclusiveUtc(to);
    const online = await buildOnlinePaymentEvents(db, start, endExclusive);
    const { paid, refund, net, rentalDeposit } = online.totals;
    const offline = await buildOfflineSettlementReference(db, {
      from: start,
      toExclusive: endExclusive,
    });

    return withDeprecation(
      NextResponse.json({
        range: { from, to },
        totals: { paid, refund, net, rentalDeposit },
        breakdown: online.breakdown,
        accountingBasis: online.accountingBasis,
        notice: online.notice,
        offline,
      }),
    );
  } catch (e) {
    console.error("[settlements/live]", e);
    return withDeprecation(NextResponse.json({ message: "internal_error" }, { status: 500 }));
  }
}
