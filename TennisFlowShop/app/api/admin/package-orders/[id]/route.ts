import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { PackageOrder } from "@/lib/types/package-order";
import { ServicePass } from "@/lib/types/pass";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { markPackageOrderPaid } from "@/lib/package-orders/mark-paid";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

function normalizePassStatus(
  status: ServicePass["status"],
): "active" | "paused" | "cancelled" | "expired" {
  if (status === "suspended") return "paused";
  return status;
}

function getCurrentRemainingForPause(passDoc: ServicePass, now: Date): number {
  const status = normalizePassStatus(passDoc.status);
  if (status === "active") {
    if (passDoc.expiresAt instanceof Date)
      return Math.max(0, passDoc.expiresAt.getTime() - now.getTime());
    return 0;
  }

  if (
    typeof passDoc.remainingValidityMs === "number" &&
    passDoc.remainingValidityMs >= 0
  )
    return passDoc.remainingValidityMs;
  if (passDoc.expiresAt instanceof Date)
    return Math.max(0, passDoc.expiresAt.getTime() - now.getTime());
  return 0;
}

//* 테스트 데이터 */
// 원하는 만료일로 직접 설정
// db.service_passes.updateOne(
//   { _id: ObjectId("68b97c5cc5ca4f768bd976b9") },
//   { $set: { expiresAt: ISODate("2024-09-04T11:47:40.819Z") } } // 예: 바로 만료 직전
// );

// // 또는 만료일 제거 -> 서버가 다시 계산
// db.service_passes.updateOne(
//   { _id: ObjectId("68b97c5cc5ca4f768bd976b9") },
//   { $unset: { expiresAt: "" } }
// );

// PATCH: 상태 변경 (결제완료 -> 패스 멱등 발급 포함)

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 관리자 인증/인가 표준 가드
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.res;

  // Origin allowlist + double-submit 토큰 기반 CSRF 검증
  const csrf = verifyAdminCsrf(request);
  if (!csrf.ok) return csrf.res;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(String(id)))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const db = (await clientPromise).db();
    const packageOrders = db.collection<PackageOrder>("packageOrders");

    const body = await request.json();
    const statusStr = String(body?.status ?? "").trim();
    const reason = String(body?.reason ?? "").trim();

    // 결제 계열 상태 집합과 paymentStatus 매핑(취소 -> 결제취소)
    const paymentSet = new Set(["결제대기", "결제완료", "결제취소", "취소"]);
    const willSetPayment = paymentSet.has(statusStr);
    const paymentToSet = statusStr === "취소" ? "결제취소" : statusStr; // 서버 저장은 결제취소로 통일

    const now = new Date();
    const _id = new ObjectId(id);

    const pkgOrder = await packageOrders.findOne({ _id });
    if (!pkgOrder)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const prevPayment = pkgOrder.paymentStatus ?? "결제대기";
    const adminLabel = String(
      guard.admin.email ?? guard.admin._id.toHexString(),
    );
    const historyDesc = willSetPayment
      ? `결제 상태 ${prevPayment} → ${paymentToSet}` +
        (reason ? ` / 사유: ${reason}` : "") +
        (adminLabel ? ` / 관리자: ${adminLabel}` : "")
      : `상태 변경: ${statusStr}` +
        (reason ? ` / 사유: ${reason}` : "") +
        (adminLabel ? ` / 관리자: ${adminLabel}` : "");

    if (statusStr === "결제완료") {
      await markPackageOrderPaid(db, {
        packageOrderId: _id,
        actorLabel: adminLabel,
        reason,
      });
    } else {
      await packageOrders.updateOne(
        { _id },
        {
          $set: {
            status: statusStr,
            updatedAt: now,
            ...(willSetPayment ? { paymentStatus: paymentToSet as any } : {}),
          },
          $push: {
            history: {
              $each: [
                {
                  status: statusStr,
                  date: now,
                  description: historyDesc,
                } satisfies PackageOrder["history"][number],
              ],
            },
          },
        },
      );
    }
    const afterDoc = await packageOrders.findOne({ _id });
    await appendAdminAudit(
      db,
      {
        type: "package_order.update",
        actorId: guard.admin._id,
        targetId: _id,
        message: "관리자 패키지 주문 상태/결제상태 수정",
        diff: {
          before: {
            status: pkgOrder.status ?? null,
            paymentStatus: prevPayment,
            expiresAt: null,
            usedCount: null,
            remainingCount: null,
            totalCount: pkgOrder.packageInfo?.sessions ?? null,
          },
          after: {
            status: afterDoc?.status ?? statusStr ?? null,
            paymentStatus:
              afterDoc?.paymentStatus ?? (willSetPayment ? paymentToSet : prevPayment),
            expiresAt: null,
            usedCount: null,
            remainingCount: null,
            totalCount:
              afterDoc?.packageInfo?.sessions ?? pkgOrder.packageInfo?.sessions ?? null,
          },
          metadata: {
            changedKeys: ["status", ...(willSetPayment ? ["paymentStatus"] : [])],
            reason: reason || null,
            actor: {
              id: String(guard.admin._id),
              email: guard.admin.email ?? null,
              name: guard.admin.name ?? null,
              role: guard.admin.role ?? "admin",
            },
          },
        },
      },
      request,
    );
    /**
     * 주문/결제 상태에 따라 연결된 패스 상태 동기화
     * - 결제완료가 아니면: paused(결제취소는 cancelled)
     * - 결제완료이면: 남은 유효기간 기준 active 복구
     */
    try {
      const passCol = db.collection<ServicePass>("service_passes");
      const now = new Date();

      const passDoc = await passCol.findOne({ orderId: _id });

      if (passDoc) {
        const hasPositiveRemaining = (passDoc.remainingCount ?? 0) > 0;

        if (statusStr !== "결제완료") {
          const nextStatus =
            statusStr === "결제취소" || statusStr === "취소"
              ? "cancelled"
              : "paused";
          const remainingValidityMs = getCurrentRemainingForPause(passDoc, now);
          const updateDoc: Partial<ServicePass> & { updatedAt: Date } = {
            status: nextStatus,
            updatedAt: now,
            remainingValidityMs,
          } as any;
          if (nextStatus === "paused") {
            updateDoc.expiresAt = null;
          }
          await passCol.updateOne({ _id: passDoc._id }, { $set: updateDoc });
        }
      }
    } catch (e) {
      console.error("[package-orders] pass status sync error", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/package-orders/[id]] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// GET: 관리자 상세 조회 (고객정보 + 사용 이력 포함)
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.res;

  try {
    const { id } = await ctx.params;

    const _id = new ObjectId(id);
    const db = (await clientPromise).db();
    const col = db.collection("packageOrders");

    const rows = await col
      .aggregate([
        { $match: { _id } },

        // 사용자 프로필 조인 (전화/이름/이메일 보강)
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDocs",
          },
        },
        { $addFields: { userDoc: { $first: "$userDocs" } } },

        // 패스 조인
        {
          $lookup: {
            from: "service_passes",
            let: { orderId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$orderId", "$$orderId"] } } },
              {
                $project: {
                  status: 1,
                  expiresAt: 1,
                  remainingCount: 1,
                  usedCount: 1,
                  packageSize: 1,
                  history: 1,
                },
              },
            ],
            as: "passDocs",
          },
        },
        { $addFields: { passDoc: { $first: "$passDocs" } } },

        // 패스/표시용 계산 + 사용 이력 변환
        {
          $addFields: {
            passUsed: { $ifNull: ["$passDoc.usedCount", 0] },
            passRemaining: {
              $ifNull: ["$passDoc.remainingCount", "$packageInfo.sessions"],
            },
            packageType: {
              $concat: [{ $toString: "$packageInfo.sessions" }, "회권"],
            },

            // 구매일/만료일 계산: 패스 값 우선
            _calcExpiry: {
              $ifNull: ["$passDoc.expiresAt", null],
            },
            expiryDate: {
              $ifNull: ["$passDoc.expiresAt", null],
            },

            serviceType: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$serviceInfo.serviceMethod", "방문"] },
                    regex: "출장",
                    options: "i",
                  },
                },
                "출장",
                "방문",
              ],
            },

            // 패스 운영 이력(연장+횟수조절) 변환 + 결제상태 변경 합치기
            passOps: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$passDoc.history", []] },
                    as: "h",
                    cond: {
                      $in: ["$$h.type", ["extend_expiry", "adjust_sessions"]],
                    },
                  },
                },
                as: "h",
                in: {
                  id: { $toString: "$$h._id" },
                  date: "$$h.at",
                  // +N일 / +N회 뱃지 값
                  extendedDays: {
                    $cond: [
                      { $eq: ["$$h.type", "extend_expiry"] },
                      {
                        $cond: [
                          { $and: ["$$h.from", "$$h.to"] },
                          {
                            $toInt: {
                              $divide: [
                                { $subtract: ["$$h.to", "$$h.from"] },
                                86400000,
                              ],
                            },
                          },
                          { $ifNull: ["$$h.daysAdded", 0] },
                        ],
                      },
                      0,
                    ],
                  },
                  extendedSessions: {
                    $cond: [
                      { $eq: ["$$h.type", "adjust_sessions"] },
                      { $ifNull: ["$$h.delta", 0] },
                      0,
                    ],
                  },
                  reason: { $ifNull: ["$$h.reason", ""] },
                  adminName: { $ifNull: ["$$h.adminName", ""] },
                  adminEmail: { $ifNull: ["$$h.adminEmail", ""] },
                  from: { $ifNull: ["$$h.from", null] },
                  to: { $ifNull: ["$$h.to", null] },
                  eventType: "$$h.type", // 'extend_expiry' | 'adjust_sessions'
                },
              },
            },

            // 주문 히스토리 중 "결제상태" 변경만 따로 변환
            paymentOps: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$history", []] },
                    as: "h",
                    cond: {
                      $in: [
                        "$$h.status",
                        ["결제대기", "결제완료", "결제취소", "취소"],
                      ],
                    },
                  },
                },
                as: "h",
                in: {
                  id: { $concat: ["pay-", { $toString: "$$h.date" }] },
                  date: "$$h.date",
                  extendedDays: 0,
                  extendedSessions: 0,
                  reason: { $ifNull: ["$$h.description", ""] },
                  adminName: "",
                  adminEmail: "",
                  from: null,
                  to: null,
                  eventType: "payment_status_change",
                  paymentStatus: "$$h.status",
                },
              },
            },

            // 패스 운영 이력(연장+횟수조절) + 결제상태 변경 합치기
            operationsHistory: {
              $concatArrays: [
                // 1) 결제 상태 변경 이벤트
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ["$history", []] },
                        as: "h",
                        cond: {
                          $in: [
                            "$$h.status",
                            ["결제대기", "결제완료", "결제취소", "취소"],
                          ],
                        },
                      },
                    },
                    as: "h",
                    in: {
                      id: { $concat: ["pay-", { $toString: "$$h.date" }] },
                      date: "$$h.date",
                      extendedDays: 0,
                      extendedSessions: 0,
                      reason: { $ifNull: ["$$h.description", ""] },
                      adminName: "",
                      adminEmail: "",
                      from: null,
                      to: null,
                      eventType: "payment_status_change",
                      paymentStatus: "$$h.status",
                    },
                  },
                },

                // 2) 패스 이력(연장/횟수조절)
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ["$passDoc.history", []] },
                        as: "h",
                        cond: {
                          $in: [
                            "$$h.type",
                            ["extend_expiry", "adjust_sessions"],
                          ],
                        },
                      },
                    },
                    as: "h",
                    in: {
                      id: { $toString: "$$h._id" },
                      date: "$$h.at",
                      extendedDays: {
                        $cond: [
                          { $eq: ["$$h.type", "extend_expiry"] },
                          {
                            $cond: [
                              { $and: ["$$h.from", "$$h.to"] },
                              {
                                $toInt: {
                                  $divide: [
                                    { $subtract: ["$$h.to", "$$h.from"] },
                                    86400000,
                                  ],
                                },
                              },
                              { $ifNull: ["$$h.daysAdded", 0] },
                            ],
                          },
                          0,
                        ],
                      },
                      extendedSessions: {
                        $cond: [
                          { $eq: ["$$h.type", "adjust_sessions"] },
                          { $ifNull: ["$$h.delta", 0] },
                          0,
                        ],
                      },
                      reason: { $ifNull: ["$$h.reason", ""] },
                      adminName: { $ifNull: ["$$h.adminName", ""] },
                      adminEmail: { $ifNull: ["$$h.adminEmail", ""] },
                      from: { $ifNull: ["$$h.from", null] },
                      to: { $ifNull: ["$$h.to", null] },
                      eventType: "$$h.type", // 'extend_expiry' | 'adjust_sessions'
                    },
                  },
                },
              ],
            },
          },
        },

        // 패스 상태(만료일 우선 적용)
        {
          $addFields: {
            passStatusKo: {
              $let: {
                vars: { exp: "$_calcExpiry" },
                in: {
                  $switch: {
                    branches: [
                      // 결제취소 또는 패스 취소
                      {
                        case: {
                          $or: [
                            { $eq: ["$paymentStatus", "결제취소"] },
                            { $eq: ["$passDoc.status", "cancelled"] },
                          ],
                        },
                        then: "취소",
                      },
                      // 남은 횟수 0 이하면 종료
                      {
                        case: { $lte: [{ $ifNull: ["$passDoc.remainingCount", 0] }, 0] },
                        then: "종료",
                      },
                      // 시간 만료
                      {
                        case: {
                          $and: [
                            { $ne: ["$$exp", null] },
                            { $lte: ["$$exp", "$$NOW"] },
                          ],
                        },
                        then: "만료",
                      },
                      // 패스 미발급이면 대기
                      { case: { $not: ["$passDoc"] }, then: "대기" },
                      // 일시정지/legacy suspended 또는 결제미완료
                      {
                        case: {
                          $or: [
                            {
                              $in: ["$passDoc.status", ["paused", "suspended"]],
                            },
                            { $ne: ["$paymentStatus", "결제완료"] },
                          ],
                        },
                        then: "비활성",
                      },
                      {
                        case: { $eq: ["$paymentStatus", "결제완료"] },
                        then: "활성",
                      },
                    ],
                    default: "대기",
                  },
                },
              },
            },
          },
        },

        // 고객 표시용: 후보 배열에서 "공백 아닌 첫 값" 선택
        {
          $addFields: {
            customerName: {
              $let: {
                vars: {
                  cands: [
                    { $ifNull: ["$serviceInfo.name", ""] },
                    { $ifNull: ["$shippingInfo.name", ""] },
                    { $ifNull: ["$userSnapshot.name", ""] },
                    { $ifNull: ["$userDoc.name", ""] },
                    { $ifNull: ["$userDoc.profile.name", ""] },
                  ],
                },
                in: {
                  $first: {
                    $filter: {
                      input: "$$cands",
                      as: "v",
                      cond: {
                        $gt: [{ $strLenCP: { $trim: { input: "$$v" } } }, 0],
                      },
                    },
                  },
                },
              },
            },
            customerEmail: {
              $let: {
                vars: {
                  cands: [
                    { $ifNull: ["$serviceInfo.email", ""] },
                    { $ifNull: ["$userSnapshot.email", ""] },
                    { $ifNull: ["$userDoc.email", ""] },
                  ],
                },
                in: {
                  $first: {
                    $filter: {
                      input: "$$cands",
                      as: "v",
                      cond: {
                        $gt: [{ $strLenCP: { $trim: { input: "$$v" } } }, 0],
                      },
                    },
                  },
                },
              },
            },
            customerPhone: {
              $let: {
                vars: {
                  cands: [
                    { $ifNull: ["$serviceInfo.phone", ""] },
                    { $ifNull: ["$shippingInfo.phone", ""] },
                    { $ifNull: ["$userDoc.phone", ""] },
                    { $ifNull: ["$userDoc.profile.phone", ""] },
                    { $ifNull: ["$userDoc.phoneNumber", ""] },
                  ],
                },
                in: {
                  $first: {
                    $filter: {
                      input: "$$cands",
                      as: "v",
                      cond: {
                        $gt: [{ $strLenCP: { $trim: { input: "$$v" } } }, 0],
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // 최종 Shape
        {
          $project: {
            _id: 0,
            id: { $toString: "$_id" },
            userId: { $toString: "$userId" },
            customer: {
              name: "$customerName",
              email: "$customerEmail",
              phone: "$customerPhone",
            },
            packageType: "$packageType",
            totalSessions: "$packageInfo.sessions",
            remainingSessions: "$passRemaining",
            usedSessions: "$passUsed",
            price: "$totalPrice",
            purchaseDate: "$createdAt",
            expiryDate: "$expiryDate",
            status: "$status",
            paymentStatus: "$paymentStatus",
            paymentMethod: "$paymentInfo.method",
            paymentProvider: "$paymentInfo.provider",
            paymentTid: "$paymentInfo.tid",
            paymentCardDisplayName: "$paymentInfo.cardDisplayName",
            paymentCardCompany: "$paymentInfo.cardCompany",
            paymentCardLabel: "$paymentInfo.cardLabel",
            paymentNiceSync: "$paymentInfo.niceSync",
            serviceType: "$serviceType",
            history: "$history",
            passStatus: "$passStatusKo",
            operationsHistory: "$operationsHistory",
            extensionHistory: "$operationsHistory",
          },
        },
      ])
      .toArray();

    const item = rows[0] || null;
    if (!item)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json({ item });
  } catch (e) {
    console.error("[GET /api/package-orders/[id]] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
