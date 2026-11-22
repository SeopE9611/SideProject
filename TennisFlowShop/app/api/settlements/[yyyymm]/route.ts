import { NextResponse } from "next/server";
import { buildOnlinePaymentEvents } from "@/app/api/settlements/_lib/paymentEvents";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { enforceAdminRateLimit } from "@/lib/admin/adminRateLimit";
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from "@/lib/admin/adminEndpointCostPolicy";
import {
  acquireAdminExecutionLock,
  releaseAdminExecutionLock,
} from "@/lib/admin/adminExecutionLock";
import { buildOfflineSettlementReference } from "@/app/api/settlements/_lib/offlineReference";

// 월 시작/끝(KST) → UTC 경계로 변환
function kstMonthRangeToUtc(yyyymm: string) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)) - 1; // 0-based
  // KST 00:00은 UTC로 -9시간
  const startUtc = new Date(Date.UTC(y, m, 1, -9, 0, 0)); // y-m-01 KST 00:00 → UTC
  const endUtc = new Date(Date.UTC(y, m + 1, 1, -9, 0, 0)); // 다음달 1일 KST 00:00 → UTC
  return { start: startUtc, end: endUtc };
}

// KST 현재 YYYYMM (예: 202510)
function nowYyyymmKST() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}${parts.month}`;
}

export async function POST(_req: Request, ctx: { params: Promise<{ yyyymm: string }> }) {
  let lockKey: string | null = null;
  let lockOwner: string | null = null;
  let lockDb: import("mongodb").Db | null = null;

  try {
    // 관리자 인증 + DB 획득(정산 스냅샷 생성은 민감 작업)
    const g = await requireAdmin(_req);
    if (!g.ok) return g.res;

    const csrf = verifyAdminCsrf(_req);
    if (!csrf.ok) return csrf.res;

    const limited = await enforceAdminRateLimit(
      _req,
      g.db,
      String(g.admin._id),
      ADMIN_EXPENSIVE_ENDPOINT_POLICIES.settlementsMutation,
    );
    if (limited) return limited;

    const db = g.db;
    lockDb = db;
    const { yyyymm } = await ctx.params;

    const createdBy = g.admin.email ?? String(g.admin._id);
    if (!/^\d{6}$/.test(yyyymm)) {
      return NextResponse.json({ message: "YYYYMM 형식이 아닙니다." }, { status: 400 });
    }

    // 01~12 월만 허용
    const y = Number(yyyymm.slice(0, 4));
    const m = Number(yyyymm.slice(4, 6));
    if (m < 1 || m > 12) {
      return NextResponse.json({ message: "월은 01~12만 가능합니다." }, { status: 400 });
    }

    // 미래월 금지(KST 기준)
    const curr = Number(nowYyyymmKST());
    if (Number(yyyymm) > curr) {
      return NextResponse.json(
        { message: "미래 월 스냅샷은 생성할 수 없습니다." },
        { status: 400 },
      );
    }

    // 장시간 집계 작업은 월 단위 단일 실행 락을 걸어 동시 생성 경쟁을 차단한다.
    lockOwner = String(g.admin._id);
    lockKey = `admin.settlements.generate:${yyyymm}`;
    const lock = await acquireAdminExecutionLock({
      db,
      lockKey,
      owner: lockOwner,
      ttlMs: 3 * 60 * 1000,
      meta: { yyyymm, route: "/api/settlements/[yyyymm]" },
    });
    if (!lock.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "execution_locked",
            message: "해당 월 정산 생성 작업이 이미 실행 중입니다.",
          },
        },
        { status: 409 },
      );
    }

    const { start, end } = kstMonthRangeToUtc(yyyymm);
    const online = await buildOnlinePaymentEvents(db, start, end);
    const { paid, refund, net, rentalDeposit } = online.totals;
    const offline = await buildOfflineSettlementReference(db, {
      from: start,
      toExclusive: end,
    });

    const snapshot = {
      yyyymm,
      totals: { paid, refund, net, rentalDeposit },
      breakdown: online.breakdown,
      accountingBasis: online.accountingBasis,
      notice: online.notice,
      createdAt: new Date(),
      createdBy,
      lastGeneratedAt: new Date(),
      lastGeneratedBy: createdBy,
      offline,
    };

    // upsert 기반 멱등 저장: 같은 월 재호출 시에도 문서가 한 건으로 유지된다.
    await db.collection("settlements").updateOne(
      { yyyymm },
      {
        $setOnInsert: {
          createdAt: snapshot.createdAt,
          createdBy: snapshot.createdBy,
        },
        $set: {
          totals: snapshot.totals,
          breakdown: snapshot.breakdown,
          lastGeneratedAt: snapshot.lastGeneratedAt,
          lastGeneratedBy: snapshot.lastGeneratedBy,
          offline: snapshot.offline,
          accountingBasis: snapshot.accountingBasis,
          notice: snapshot.notice,
        },
      },
      { upsert: true },
    );

    await appendAdminAudit(
      db,
      {
        type: "admin.settlements.generate",
        actorId: g.admin._id,
        targetId: yyyymm,
        message: "정산 스냅샷 생성/갱신",
        diff: {
          yyyymm,
          totals: snapshot.totals,
          breakdown: snapshot.breakdown,
        },
      },
      _req,
    );

    return NextResponse.json({ success: true, snapshot });
  } catch (e) {
    console.error("[settlements/:yyyymm]", e);
    return NextResponse.json({ message: "internal_error" }, { status: 500 });
  } finally {
    if (lockDb && lockKey && lockOwner) {
      await releaseAdminExecutionLock(lockDb, lockKey, lockOwner);
    }
  }
}

// 스냅샷 삭제 API
export async function DELETE(_req: Request, ctx: { params: Promise<{ yyyymm: string }> }) {
  try {
    const g = await requireAdmin(_req);
    if (!g.ok) return g.res;

    const csrf = verifyAdminCsrf(_req);
    if (!csrf.ok) return csrf.res;

    const limited = await enforceAdminRateLimit(
      _req,
      g.db,
      String(g.admin._id),
      ADMIN_EXPENSIVE_ENDPOINT_POLICIES.settlementsMutation,
    );
    if (limited) return limited;

    const db = g.db;
    const { yyyymm } = await ctx.params;

    if (!/^\d{6}$/.test(yyyymm)) {
      return NextResponse.json(
        { success: false, message: "yyyymm 형식 필요(예: 202510)" },
        { status: 400 },
      );
    }

    const result = await db.collection("settlements").deleteOne({ yyyymm });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "해당 스냅샷을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await appendAdminAudit(
      db,
      {
        type: "admin.settlements.delete",
        actorId: g.admin._id,
        targetId: yyyymm,
        message: "정산 스냅샷 삭제",
        diff: { yyyymm, deletedCount: result.deletedCount },
      },
      _req,
    );

    return NextResponse.json({
      success: true,
      message: `${yyyymm} 스냅샷이 삭제되었습니다.`,
    });
  } catch (e) {
    console.error("[settlements/:yyyymm DELETE]", e);
    return NextResponse.json({ message: "internal_error" }, { status: 500 });
  }
}
