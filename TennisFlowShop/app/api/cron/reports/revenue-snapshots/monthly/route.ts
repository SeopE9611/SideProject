import { NextResponse } from "next/server";
import { getKstPreviousMonthYyyymm } from "@/lib/date/kst";
import { getDb } from "@/lib/mongodb";
import {
  buildMonthlyRevenueReportSnapshot,
  REVENUE_REPORT_YYYY_MM_RE,
  saveRevenueReportSnapshot,
  serializeDate,
} from "@/app/api/admin/reports/revenue/_lib/revenueReportSnapshots";

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function validateCronSecret(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, message: "cron secret is not configured" },
      { status: 503 },
    );
  }

  if (getBearerToken(req.headers) !== cronSecret) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(req: Request) {
  const authError = validateCronSecret(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const yyyymmOverride = url.searchParams.get("yyyymm")?.trim() ?? "";
  if (yyyymmOverride && !REVENUE_REPORT_YYYY_MM_RE.test(yyyymmOverride)) {
    return NextResponse.json({ ok: false, message: "invalid yyyymm" }, { status: 400 });
  }

  const yyyymm = yyyymmOverride || getKstPreviousMonthYyyymm();
  const generatedAt = new Date().toISOString();

  try {
    const db = await getDb();
    const snapshotInput = await buildMonthlyRevenueReportSnapshot(db, {
      yyyymm,
      status: "finalized",
      source: "auto",
      meta: {
        source: "cron_monthly",
        generatedAt,
        generatedBy: "cron",
        trigger: yyyymmOverride ? "yyyymm_override" : "monthly_previous_month",
        cron: true,
      },
    });

    if (!snapshotInput) {
      return NextResponse.json({ ok: false, message: "failed to build revenue report" }, { status: 500 });
    }

    const { snapshot } = await saveRevenueReportSnapshot(db, snapshotInput, { actorId: "cron" });
    if (!snapshot) {
      return NextResponse.json(
        { ok: false, message: "snapshot already exists for this month. please retry." },
        { status: 409 },
      );
    }

    const updatedAt = serializeDate(snapshot.updatedAt);
    return NextResponse.json({
      ok: true,
      yyyymm: snapshot.yyyymm,
      status: snapshot.status,
      item: {
        id: String(snapshot._id),
        yyyymm: snapshot.yyyymm,
        status: snapshot.status,
        source: snapshot.source ?? null,
        updatedAt,
      },
    });
  } catch (error) {
    console.error("[cron][revenue-snapshots][monthly]", error);
    return NextResponse.json({ ok: false, message: "internal_error" }, { status: 500 });
  }
}
