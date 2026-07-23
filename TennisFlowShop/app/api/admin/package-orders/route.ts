import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { buildAdminPackageStateStages } from "@/lib/admin/package-state-read-model";

type SortKey =
  | "customer"
  | "purchaseDate"
  | "expiryDate"
  | "remainingSessions"
  | "price"
  | "package"
  | "progress"
  | "usage"
  | "payment"
  | "activation"
  | "attention"
  | "status";
const legacyUsage: Record<string, string> = {
  활성: "available",
  비활성: "paused",
  일시정지: "paused",
  종료: "exhausted",
  만료: "expired",
  취소: "cancelled",
  대기: "not_issued",
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  try {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 10));
    const usage = sp.get("usage") ?? legacyUsage[sp.get("status") ?? ""] ?? "all";
    const paymentRaw = sp.get("payment") ?? "all";
    const payment =
      (
        { 결제완료: "paid", 결제대기: "pending_any", 결제취소: "cancelled" } as Record<
          string,
          string
        >
      )[paymentRaw] ?? paymentRaw;
    const activation = sp.get("activation") ?? "all",
      attention = sp.get("attention") ?? "all",
      preset = sp.get("preset");
    const match: Document = {};
    const q = (sp.get("q") ?? "").trim();
    if (sp.get("package") && sp.get("package") !== "all")
      match["packageInfo.sessions"] = Number(sp.get("package"));
    if (sp.get("service") && sp.get("service") !== "all")
      match["serviceInfo.serviceMethod"] = { $regex: sp.get("service"), $options: "i" };
    if (q) {
      const or: Document[] = [
        { "userSnapshot.name": { $regex: q, $options: "i" } },
        { "userSnapshot.email": { $regex: q, $options: "i" } },
        { "serviceInfo.name": { $regex: q, $options: "i" } },
        { "serviceInfo.email": { $regex: q, $options: "i" } },
        { "shippingInfo.name": { $regex: q, $options: "i" } },
      ];
      if (ObjectId.isValid(q)) or.push({ _id: new ObjectId(q) });
      match.$or = or;
    }
    const [rawKey, rawDir] = (sp.get("sort") ?? "").split(":");
    const key = rawKey === "status" ? "usage" : (rawKey as SortKey);
    const dir = rawDir === "asc" ? 1 : -1;
    const sortMap: Record<SortKey, string> = {
      customer: "customerName",
      purchaseDate: "createdAt",
      expiryDate: "expiryDate",
      remainingSessions: "remainingSessions",
      price: "price",
      package: "totalSessions",
      progress: "progressPercent",
      usage: "usageRank",
      payment: "paymentRank",
      activation: "activationRank",
      attention: "requiresAttention",
      status: "usageRank",
    };
    const pipeline: Document[] = [
      { $match: match },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userDocs" } },
      { $addFields: { userDoc: { $first: "$userDocs" } } },
      {
        $lookup: {
          from: "service_passes",
          let: { orderId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$orderId", "$$orderId"] } } },
            { $project: { status: 1, expiresAt: 1, remainingCount: 1, usedCount: 1 } },
          ],
          as: "passDocs",
        },
      },
      { $addFields: { passDoc: { $first: "$passDocs" } } },
      ...buildAdminPackageStateStages(),
      {
        $addFields: {
          customerName: {
            $ifNull: ["$serviceInfo.name", { $ifNull: ["$userSnapshot.name", "$userDoc.name"] }],
          },
          serviceType: {
            $cond: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$serviceInfo.serviceMethod", ""] },
                  regex: "출장",
                },
              },
              "출장",
              "방문",
            ],
          },
          usageRank: {
            $indexOfArray: [
              ["cancelled", "expired", "exhausted", "not_issued", "unknown", "paused", "available"],
              "$usageState",
            ],
          },
          paymentRank: {
            $indexOfArray: [
              [
                "cancelled",
                "refunded",
                "refunding",
                "failed",
                "unknown",
                "pending",
                "bank_pending",
                "pg_pending",
                "not_required",
                "paid",
              ],
              "$paymentState",
            ],
          },
          activationRank: {
            $indexOfArray: [
              [
                "cancelled",
                "failed",
                "unknown",
                "awaiting_payment",
                "pending_issue",
                "paused",
                "ended",
                "active",
              ],
              "$activationState",
            ],
          },
        },
      },
      ...(usage !== "all" ? [{ $match: { usageState: usage } }] : []),
      ...(payment !== "all"
        ? [
            {
              $match: {
                paymentState:
                  payment === "pending_any"
                    ? { $in: ["bank_pending", "pg_pending", "pending"] }
                    : payment,
              },
            },
          ]
        : []),
      ...(activation !== "all" ? [{ $match: { activationState: activation } }] : []),
      ...(attention !== "all"
        ? [{ $match: { requiresAttention: attention === "needs_attention" } }]
        : []),
      ...(preset === "payment-check"
        ? [
            {
              $match: {
                attentionReasons: {
                  $in: [
                    "payment_pending",
                    "payment_failed",
                    "payment_refunding",
                    "payment_unknown",
                    "pass_issue_pending",
                    "terminal_payment_with_live_pass",
                  ],
                },
              },
            },
          ]
        : []),
      { $sort: { [sortMap[key] ?? "createdAt"]: dir, createdAt: -1, _id: -1 } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                id: { $toString: "$_id" },
                userId: { $toString: "$userId" },
                customer: {
                  name: "$customerName",
                  email: "$userSnapshot.email",
                  phone: "$serviceInfo.phone",
                },
                packageType: "$packageType",
                totalSessions: 1,
                remainingSessions: 1,
                usedSessions: 1,
                price: 1,
                purchaseDate: "$createdAt",
                expiryDate: 1,
                rawOrderStatus: 1,
                rawPaymentStatus: 1,
                rawPassStatus: 1,
                paymentMethod: 1,
                paymentProvider: 1,
                hasIssuedPass: 1,
                paymentState: 1,
                paymentNeedsCheck: 1,
                usageState: 1,
                activationState: 1,
                requiresAttention: 1,
                attentionReasons: 1,
                daysUntilExpiry: 1,
                isExpirySoon: 1,
                progressPercent: 1,
                legacyPassStatus: 1,
                legacyPaymentStatus: 1,
                paymentStatus: "$rawPaymentStatus",
                passStatus: "$legacyPassStatus",
                serviceType: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
          metrics: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                available: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$usageState", "available"] },
                          { $eq: ["$paymentState", "paid"] },
                          { $eq: ["$requiresAttention", false] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                needsAttention: { $sum: { $cond: ["$requiresAttention", 1, 0] } },
                revenue: {
                  $sum: {
                    $cond: [{ $eq: ["$paymentState", "paid"] }, { $ifNull: ["$price", 0] }, 0],
                  },
                },
                expirySoon: { $sum: { $cond: ["$isExpirySoon", 1, 0] } },
              },
            },
          ],
        },
      },
    ];
    const result =
      (
        await (await clientPromise).db().collection("packageOrders").aggregate(pipeline).toArray()
      )[0] ?? {};
    const metrics = result.metrics?.[0] ?? {
      total: 0,
      available: 0,
      needsAttention: 0,
      revenue: 0,
      expirySoon: 0,
    };
    return NextResponse.json({
      items: result.items ?? [],
      total: result.total?.[0]?.count ?? 0,
      page,
      pageSize: limit,
      metrics,
    });
  } catch (e) {
    console.error("[/api/package-orders] GET error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
