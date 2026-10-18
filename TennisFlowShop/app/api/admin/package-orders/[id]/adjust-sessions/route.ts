import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { PackageOrder } from "@/lib/types/package-order";
import type { UpdateFilter } from "mongodb";
import type { ServicePass } from "@/lib/types/pass";
import { ObjectId as OID } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { isCountEnded, shouldRestoreActive } from "@/lib/pass-status";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { getAdminPackageOperationCapabilities } from "@/lib/admin/package-operation-capabilities";

type PassHistoryItem = {
  _id: OID;
  type: "extend_expiry" | "adjust_sessions";
  at: Date;
  from?: number | null; // 이전 remainingCount
  to?: number | null; // 이후 remainingCount
  delta?: number;
  reason?: string;
  adminId?: string | OID | null;
  adminName?: string | null;
  adminEmail?: string | null;
};

class AdjustmentError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

// 이제 상태 변경해보기.STEP 3: 결제 상태에 따라 동작 잠금(서버+UI)

// body: { delta: number, clampZero?: boolean, reason?: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 관리자 인증/인가 표준 가드
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  // Origin allowlist + double-submit 토큰 기반 CSRF 검증
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

    // 입력 파싱
    const body = await req.json().catch(() => ({}));
    const delta = Number(body?.delta ?? 0);
    const clampZero = Boolean(body?.clampZero);
    const reason = String(body?.reason ?? "");
    if (!Number.isFinite(delta) || delta === 0)
      return NextResponse.json({ error: "delta must be a non-zero number" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    const packageOrders = db.collection<PackageOrder>("packageOrders");
    const passes = db.collection<ServicePass & { history?: PassHistoryItem[] }>("service_passes");

    const _id = new ObjectId(id);

    const session = client.startSession();
    const adjustment = await (async () => {
      try {
        return await session.withTransaction(async () => {
          const passDoc = await passes.findOne({ orderId: _id }, { session });
          if (!passDoc) throw new AdjustmentError(404, "service pass not found for this order");

          const pkgOrder = await packageOrders.findOne({ _id }, { session });
          if (!pkgOrder) throw new AdjustmentError(404, "order not found");

          const now = new Date();
          const operationCapabilities = getAdminPackageOperationCapabilities({
            paymentStatus: pkgOrder.paymentStatus,
            hasIssuedPass: true,
            passStatus: passDoc.status,
            expiresAt: passDoc.expiresAt,
            remainingCount: passDoc.remainingCount,
            now,
          });
          if (!operationCapabilities.canAdjustSessions)
            throw new AdjustmentError(409, operationCapabilities.blockReasons[0]);

          const prev = passDoc.remainingCount;
          let next = prev + delta;
          if (clampZero && next < 0) next = 0;

          const nextStatus = isCountEnded(next)
            ? "expired"
            : shouldRestoreActive({
                  paymentStatus: pkgOrder.paymentStatus,
                  passStatus: passDoc.status,
                  remainingCount: next,
                  expiresAt: passDoc.expiresAt,
                  now,
                })
              ? "active"
              : passDoc.status;

          // 동시 소비·복원과 쓰기 충돌이 발생하면 최신 스냅샷으로 재계산한다.
          const passUpdate = await passes.updateOne({
            _id: passDoc._id,
            orderId: _id,
            remainingCount: prev,
            status: passDoc.status,
            expiresAt: passDoc.expiresAt ?? null,
          }, {
            $set: { remainingCount: next, status: nextStatus, updatedAt: now },
            $push: {
              history: {
                $each: [{
                  _id: new OID(),
                  type: "adjust_sessions",
                  at: now,
                  from: prev,
                  to: next,
                  delta,
                  reason: reason || "",
                  adminId: guard.admin._id,
                  adminName: guard.admin.email ?? null,
                  adminEmail: guard.admin.email ?? null,
                } as PassHistoryItem],
              },
            },
          } as UpdateFilter<ServicePass & { history: PassHistoryItem[] }>, { session });
          if (!passUpdate.acknowledged || passUpdate.matchedCount !== 1 || passUpdate.modifiedCount !== 1) {
            throw new AdjustmentError(409, "service pass changed; refresh and retry");
          }

          const orderUpdate = await packageOrders.updateOne(
            { _id, paymentStatus: "결제완료" },
            {
              $push: {
                history: {
                  $each: [{
                    status: "횟수조절",
                    date: now,
                    description: `남은횟수 ${prev} → ${next}${reason ? ` (${reason})` : ""}`,
                  } satisfies PackageOrder["history"][number]],
                },
              },
              $set: { updatedAt: now },
            },
            { session },
          );
          if (!orderUpdate.acknowledged || orderUpdate.matchedCount !== 1 || orderUpdate.modifiedCount !== 1) {
            throw new AdjustmentError(409, "package order changed; refresh and retry");
          }

          const freshPass = await passes.findOne({ _id: passDoc._id }, { session });
          if (!freshPass) throw new AdjustmentError(409, "service pass changed; refresh and retry");
          return { passDoc, pkgOrder, prev, next, nextStatus, freshPass };
        });
      } finally {
        await session.endSession();
      }
    })();
    if (!adjustment) throw new Error("PACKAGE_ADJUSTMENT_TRANSACTION_FAILED");
    const { passDoc, pkgOrder, prev, next, nextStatus, freshPass } = adjustment;
    // 감사 실패로 커밋된 조정을 실패 응답하여 같은 delta를 재적용하지 않게 한다.
    await appendAdminAudit(
      db,
      {
        type: "package.sessions.adjust",
        actorId: guard.admin._id,
        targetId: _id,
        message: "패키지 잔여 횟수 조정",
        diff: {
          targetType: "packageOrder",
          actorEmail: guard.admin.email ?? null,
          actorName: guard.admin.name ?? null,
          actorRole: guard.admin.role ?? null,
          metadata: {
            actor: {
              id: String(guard.admin._id),
              email: guard.admin.email ?? null,
              name: guard.admin.name ?? null,
              role: guard.admin.role ?? "admin",
            },
          },
          before: {
            remainingCount: prev,
            usedCount: Number((passDoc as any).usedCount ?? 0),
            totalCount: Number((passDoc as any).totalCount ?? 0),
            status: passDoc.status ?? null,
          },
          after: {
            remainingCount: Number(freshPass?.remainingCount ?? next),
            usedCount: Number((freshPass as any)?.usedCount ?? (passDoc as any).usedCount ?? 0),
            totalCount: Number((freshPass as any)?.totalCount ?? (passDoc as any).totalCount ?? 0),
            status: String(freshPass?.status ?? nextStatus ?? passDoc.status),
          },
          servicePassId: String(passDoc._id),
          customerId: String((pkgOrder as any).userId ?? ""),
          packageName: (pkgOrder as any).packageSnapshot?.name ?? null,
          packageType: (pkgOrder as any).packageSnapshot?.type ?? null,
          delta,
          reason: reason || null,
        },
      },
      req,
    ).catch((auditError) => {
      console.error("[package.sessions.adjust] committed adjustment audit failed", auditError);
    });
    return NextResponse.json({ ok: true, pass: freshPass });
  } catch (e) {
    if (e instanceof AdjustmentError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[POST /api/package-orders/:id/adjust-sessions] error", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
