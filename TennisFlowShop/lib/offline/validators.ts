import { normalizePhone } from "@/lib/offline/normalizers";
import { ObjectId } from "mongodb";
import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .refine((v) => normalizePhone(v).length > 0, "invalid phone");

export const offlineCustomerCreateSchema = z.object({
  linkedUserId: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(80),
  phone: phoneSchema,
  email: z.string().trim().email().max(254).optional().nullable(),
  memo: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

export const offlineCustomerPatchSchema = offlineCustomerCreateSchema.partial();

const dateInputSchema = z.union([z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "invalid date"), z.date()]);

const paymentSchema = z.object({
  status: z.enum(["pending", "paid", "refunded"]),
  method: z.enum(["cash", "card", "bank_transfer", "etc"]),
  amount: z.number().finite().min(0),
  paidAt: z.string().datetime().optional(),
});

const optionalNonNegativeNumberSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // 빈 문자열 또는 공백만 있는 문자열은 입력 안 함으로 처리합니다.
    if (!trimmed) {
      return undefined;
    }

    return Number(trimmed);
  }

  return value;
}, z.number().finite().min(0).optional());

export const offlineRecordCreateSchema = z.object({
  offlineCustomerId: z
    .string()
    .trim()
    .refine((v) => ObjectId.isValid(v), "invalid object id"),
  userId: z.string().optional().nullable(),
  kind: z.enum(["stringing", "package_sale", "etc"]),
  occurredAt: dateInputSchema.optional(),
  status: z.enum(["received", "in_progress", "completed", "picked_up", "canceled"]),
  lines: z
    .array(
      z.object({
        racketName: z.string().optional(),
        stringProductId: z.string().optional(),

        // 기존 기록 호환용: 예전에는 스트링명을 stringName 하나로 저장했습니다.
        stringName: z.string().optional(),

        // 신규 구조: 하이브리드 작업을 위해 메인/크로스 스트링을 분리 저장합니다.
        mainStringName: z.string().optional(),
        crossStringName: z.string().optional(),

        tensionMain: z.string().optional(),
        tensionCross: z.string().optional(),

        // 라켓별 금액입니다. 전체 결제금액은 payment.amount에 그대로 둡니다.
        amount: optionalNonNegativeNumberSchema,

        note: z.string().optional(),
        mountingFee: z.number().finite().optional(),
      }),
    )
    .default([]),
  payment: paymentSchema,
  points: z
    .object({
      earn: z.number().optional(),
      use: z.number().optional(),
      grantTxId: z.string().optional(),
      deductTxId: z.string().optional(),
    })
    .optional(),
  packageUsage: z
    .object({
      passId: z.string().optional(),
      usedCount: z.number().optional(),
      consumptionId: z.string().optional(),
    })
    .optional(),
  memo: z.string().max(2000).optional(),
});

export const offlineRecordPatchSchema = z
  .object({
    userId: z.string().optional().nullable(),
    kind: z.enum(["stringing", "package_sale", "etc"]).optional(),
    occurredAt: dateInputSchema.optional(),
    status: z.enum(["received", "in_progress", "completed", "picked_up", "canceled"]).optional(),
    lines: z
      .array(
        z.object({
          racketName: z.string().optional(),
          stringProductId: z.string().optional(),

          // 기존 기록 호환용
          stringName: z.string().optional(),

          // 신규 메인/크로스 스트링명
          mainStringName: z.string().optional(),
          crossStringName: z.string().optional(),

          tensionMain: z.string().optional(),
          tensionCross: z.string().optional(),

          // 라켓별 금액
          amount: optionalNonNegativeNumberSchema,

          note: z.string().optional(),
          mountingFee: z.union([z.string(), z.number().finite()]).optional(),
        }),
      )
      .optional(),
    payment: paymentSchema.partial().optional(),

    memo: z.string().max(2000).optional(),
  })
  .strict();
