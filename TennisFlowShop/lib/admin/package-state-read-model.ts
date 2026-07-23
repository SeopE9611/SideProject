import "server-only";

import type { Document } from "mongodb";

const token = (field: string): Document => ({
  $replaceAll: {
    input: {
      $replaceAll: {
        input: {
          $replaceAll: {
            input: {
              $toLower: {
                $trim: {
                  input: { $cond: [{ $eq: [{ $type: field }, "string"] }, field, ""] },
                },
              },
            },
            find: " ",
            replacement: "",
          },
        },
        find: "_",
        replacement: "",
      },
    },
    find: "-",
    replacement: "",
  },
});

/** passDoc 조인 이후 목록·상세 GET에서 공유하는 읽기 전용 상태 계산입니다. */
export function buildAdminPackageStateStages(): Document[] {
  const terminal = [
    "canceled",
    "cancelled",
    "paymentcanceled",
    "paymentcancelled",
    "결제취소",
    "취소",
    "부분취소",
    "partialcanceled",
    "partialcancelled",
  ];
  return [
    {
      $addFields: {
        rawOrderStatus: { $cond: [{ $eq: [{ $type: "$status" }, "string"] }, "$status", null] },
        rawPaymentStatus: {
          $cond: [{ $eq: [{ $type: "$paymentStatus" }, "string"] }, "$paymentStatus", null],
        },
        rawPassStatus: {
          $cond: [{ $eq: [{ $type: "$passDoc.status" }, "string"] }, "$passDoc.status", null],
        },
        paymentMethod: "$paymentInfo.method",
        paymentProvider: "$paymentInfo.provider",
        hasIssuedPass: { $eq: [{ $type: "$passDoc" }, "object"] },
      },
    },
    {
      $addFields: {
        _paymentToken: token("$rawPaymentStatus"),
        _orderToken: token("$rawOrderStatus"),
        _passToken: token("$rawPassStatus"),
        _methodToken: token("$paymentMethod"),
        _providerToken: token("$paymentProvider"),
        totalSessions: {
          $cond: [{ $isNumber: "$packageInfo.sessions" }, "$packageInfo.sessions", null],
        },
        usedSessions: {
          $cond: [
            { $and: ["$hasIssuedPass", { $isNumber: "$passDoc.usedCount" }] },
            "$passDoc.usedCount",
            null,
          ],
        },
        remainingSessions: {
          $cond: [
            { $and: ["$hasIssuedPass", { $isNumber: "$passDoc.remainingCount" }] },
            "$passDoc.remainingCount",
            null,
          ],
        },
        price: { $cond: [{ $isNumber: "$totalPrice" }, "$totalPrice", null] },
        expiryDate: {
          $cond: [{ $eq: [{ $type: "$passDoc.expiresAt" }, "date"] }, "$passDoc.expiresAt", null],
        },
      },
    },
    {
      $addFields: {
        paymentState: {
          $switch: {
            branches: [
              {
                case: {
                  $in: [
                    "$_paymentToken",
                    ["refunding", "refundprocessing", "환불처리중", "환불진행중"],
                  ],
                },
                then: "refunding",
              },
              {
                case: {
                  $in: [
                    "$_paymentToken",
                    ["refunded", "refund", "refundcompleted", "환불", "환불완료"],
                  ],
                },
                then: "refunded",
              },
              {
                case: {
                  $or: [{ $in: ["$_paymentToken", terminal] }, { $in: ["$_orderToken", terminal] }],
                },
                then: "cancelled",
              },
              {
                case: {
                  $in: [
                    "$_orderToken",
                    ["refunding", "refundprocessing", "환불처리중", "환불진행중"],
                  ],
                },
                then: "refunding",
              },
              {
                case: {
                  $in: [
                    "$_orderToken",
                    ["refunded", "refund", "refundcompleted", "환불", "환불완료"],
                  ],
                },
                then: "refunded",
              },
              {
                case: { $in: ["$_paymentToken", ["failed", "paymentfailed", "결제실패"]] },
                then: "failed",
              },
              {
                case: { $and: [{ $isNumber: "$totalPrice" }, { $lte: ["$totalPrice", 0] }] },
                then: "not_required",
              },
              {
                case: {
                  $in: ["$_paymentToken", ["paid", "paymentcompleted", "approved", "결제완료"]],
                },
                then: "paid",
              },
              {
                case: {
                  $in: [
                    "$_paymentToken",
                    [
                      "pending",
                      "paymentpending",
                      "unpaid",
                      "ready",
                      "bankpending",
                      "결제대기",
                      "대기중",
                      "입금확인",
                      "활성화대기",
                    ],
                  ],
                },
                then: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $or: [
                            {
                              $regexMatch: {
                                input: "$_methodToken",
                                regex: "무통장|계좌|banktransfer|manualbanktransfer|deposit",
                              },
                            },
                            {
                              $regexMatch: {
                                input: "$_providerToken",
                                regex: "무통장|계좌|banktransfer|manualbanktransfer|deposit",
                              },
                            },
                          ],
                        },
                        then: "bank_pending",
                      },
                      {
                        case: { $in: ["$_providerToken", ["nicepay", "toss", "tosspayments"]] },
                        then: "pg_pending",
                      },
                    ],
                    default: "pending",
                  },
                },
              },
            ],
            default: "unknown",
          },
        },
      },
    },
    {
      $addFields: {
        paymentNeedsCheck: {
          $in: [
            "$paymentState",
            ["bank_pending", "pg_pending", "pending", "failed", "refunding", "unknown"],
          ],
        },
        usageState: {
          $switch: {
            branches: [
              { case: { $not: ["$hasIssuedPass"] }, then: "not_issued" },
              {
                case: { $in: ["$_passToken", ["cancelled", "canceled", "취소"]] },
                then: "cancelled",
              },
              {
                case: {
                  $and: [
                    { $isNumber: "$passDoc.remainingCount" },
                    { $lte: ["$passDoc.remainingCount", 0] },
                  ],
                },
                then: "exhausted",
              },
              {
                case: {
                  $or: [
                    { $and: [{ $ne: ["$expiryDate", null] }, { $lte: ["$expiryDate", "$$NOW"] }] },
                    { $in: ["$_passToken", ["expired", "만료"]] },
                  ],
                },
                then: "expired",
              },
              {
                case: { $in: ["$_passToken", ["paused", "suspended", "일시정지"]] },
                then: "paused",
              },
              { case: { $in: ["$_passToken", ["active", "활성"]] }, then: "available" },
            ],
            default: "unknown",
          },
        },
      },
    },
    {
      $addFields: {
        activationState: {
          $cond: [
            "$hasIssuedPass",
            {
              $switch: {
                branches: [
                  { case: { $eq: ["$usageState", "available"] }, then: "active" },
                  { case: { $eq: ["$usageState", "paused"] }, then: "paused" },
                  { case: { $in: ["$usageState", ["exhausted", "expired"]] }, then: "ended" },
                  { case: { $eq: ["$usageState", "cancelled"] }, then: "cancelled" },
                ],
                default: "unknown",
              },
            },
            {
              $switch: {
                branches: [
                  {
                    case: { $in: ["$paymentState", ["bank_pending", "pg_pending", "pending"]] },
                    then: "awaiting_payment",
                  },
                  {
                    case: { $in: ["$paymentState", ["paid", "not_required"]] },
                    then: "pending_issue",
                  },
                  { case: { $eq: ["$paymentState", "failed"] }, then: "failed" },
                  {
                    case: { $in: ["$paymentState", ["cancelled", "refunding", "refunded"]] },
                    then: "cancelled",
                  },
                ],
                default: "unknown",
              },
            },
          ],
        },
        daysUntilExpiry: {
          $cond: [
            { $ne: ["$expiryDate", null] },
            { $ceil: { $divide: [{ $subtract: ["$expiryDate", "$$NOW"] }, 86400000] } },
            null,
          ],
        },
        progressPercent: {
          $cond: [
            {
              $and: [
                "$hasIssuedPass",
                { $ne: ["$usedSessions", null] },
                { $ne: ["$remainingSessions", null] },
                { $gt: [{ $add: ["$usedSessions", "$remainingSessions"] }, 0] },
              ],
            },
            {
              $min: [
                100,
                {
                  $max: [
                    0,
                    {
                      $multiply: [
                        {
                          $divide: [
                            "$usedSessions",
                            { $add: ["$usedSessions", "$remainingSessions"] },
                          ],
                        },
                        100,
                      ],
                    },
                  ],
                },
              ],
            },
            null,
          ],
        },
      },
    },
    {
      $addFields: {
        attentionReasons: {
          $concatArrays: [
            {
              $cond: [
                { $in: ["$paymentState", ["bank_pending", "pg_pending", "pending"]] },
                ["payment_pending"],
                [],
              ],
            },
            { $cond: [{ $eq: ["$paymentState", "failed"] }, ["payment_failed"], []] },
            { $cond: [{ $eq: ["$paymentState", "refunding"] }, ["payment_refunding"], []] },
            { $cond: [{ $eq: ["$paymentState", "unknown"] }, ["payment_unknown"], []] },
            {
              $cond: [
                {
                  $and: [
                    { $not: ["$hasIssuedPass"] },
                    { $in: ["$paymentState", ["paid", "not_required"]] },
                  ],
                },
                ["pass_issue_pending"],
                [],
              ],
            },
            { $cond: [{ $eq: ["$usageState", "paused"] }, ["pass_paused"], []] },
            { $cond: [{ $eq: ["$usageState", "unknown"] }, ["pass_unknown"], []] },
            {
              $cond: [
                {
                  $and: [
                    { $in: ["$paymentState", ["failed", "cancelled", "refunding", "refunded"]] },
                    { $in: ["$usageState", ["available", "paused"]] },
                  ],
                },
                ["terminal_payment_with_live_pass"],
                [],
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        requiresAttention: { $gt: [{ $size: "$attentionReasons" }, 0] },
        isExpirySoon: {
          $and: [
            { $eq: ["$paymentState", "paid"] },
            { $eq: ["$usageState", "available"] },
            { $gt: ["$daysUntilExpiry", 0] },
            { $lte: ["$daysUntilExpiry", 30] },
          ],
        },
        packageType: {
          $cond: [
            { $isNumber: "$packageInfo.sessions" },
            { $concat: [{ $toString: "$packageInfo.sessions" }, "회권"] },
            "-",
          ],
        },
        legacyPassStatus: {
          $switch: {
            branches: [
              { case: { $eq: ["$usageState", "available"] }, then: "활성" },
              { case: { $eq: ["$usageState", "paused"] }, then: "일시정지" },
              { case: { $eq: ["$usageState", "exhausted"] }, then: "종료" },
              { case: { $eq: ["$usageState", "expired"] }, then: "만료" },
              { case: { $eq: ["$usageState", "cancelled"] }, then: "취소" },
              { case: { $eq: ["$usageState", "not_issued"] }, then: "대기" },
            ],
            default: "비활성",
          },
        },
        legacyPaymentStatus: {
          $switch: {
            branches: [
              { case: { $eq: ["$paymentState", "paid"] }, then: "결제완료" },
              {
                case: { $in: ["$paymentState", ["bank_pending", "pg_pending", "pending"]] },
                then: "결제대기",
              },
              { case: { $in: ["$paymentState", ["cancelled", "refunded"]] }, then: "결제취소" },
            ],
            default: null,
          },
        },
      },
    },
  ];
}
