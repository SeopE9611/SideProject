import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { buildOfflineSettlementReference } from "@/app/api/settlements/_lib/offlineReference";
import { buildOnlinePaymentEvents } from "@/app/api/settlements/_lib/paymentEvents";

// KST 00:00을 UTC로 보정해 월 경계 계산 (DST 없음 가정: KST=UTC+9)
function kstMonthRangeToUtc(yyyymm: string) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)) - 1; // 0-based month
  // KST 1일 00:00 → UTC는 -9시간
  const startUtc = new Date(Date.UTC(y, m, 1, -9, 0, 0));
  const endUtc = new Date(Date.UTC(y, m + 1, 1, -9, 0, 0)); // 다음달 1일 00:00 (KST) → UTC
  return { start: startUtc, end: endUtc };
}

// (선택) "지난달" 계산도 KST '오늘' 기준으로 하고 싶으면:
function nowInKst() {
  const utc = new Date();
  // UTC + 9시간 = KST
  return new Date(utc.getTime() + 9 * 60 * 60 * 1000);
}
function prevYYYMM_KST() {
  const kst = nowInKst();
  const y = kst.getFullYear();
  const m = kst.getMonth(); // 0-based (KST)
  // 지난달
  const d = new Date(y, m - 1, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 지난달 yyyymm
function prevYYYMM() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

export async function POST() {
  try {
    const secret = (await headers()).get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ message: "forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const yyyymm = prevYYYMM_KST(); // 또는 기존 prevYYYMM() 그대로 사용해도 OK
    const { start, end } = kstMonthRangeToUtc(yyyymm);

    const online = await buildOnlinePaymentEvents(db, start, end);
    const { paid, refund, net, rentalDeposit } = online.totals;
    const offline = await buildOfflineSettlementReference(db, {
      from: start,
      toExclusive: end,
    });

    await db.collection("settlements").updateOne(
      { yyyymm },
      {
        $setOnInsert: { createdAt: new Date(), createdBy: "cron" },
        $set: {
          totals: { paid, refund, net, rentalDeposit },
          breakdown: online.breakdown,
          accountingBasis: online.accountingBasis,
          notice: online.notice,
          lastGeneratedAt: new Date(),
          lastGeneratedBy: "cron",
          offline,
        },
      },
      { upsert: true },
    );

    console.log("[cron-monthly]", {
      yyyymm,
      totals: { paid, refund, net, rentalDeposit },
      counts: online.breakdown,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, yyyymm });
  } catch (e) {
    console.error("[cron-monthly]", e);
    return NextResponse.json({ message: "internal_error" }, { status: 500 });
  }
}
