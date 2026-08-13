import { ObjectId } from "mongodb";
import { z } from "zod";

import { assertAttemptId } from "./toss-pay-contract";

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optionalTrimmed = (max: number) => z.string().trim().max(max).optional().default("");

export function toSafeValidationDiagnostic(issues: readonly z.ZodIssue[]) {
  return issues.map((issue) => ({ path: issue.path.join("."), code: issue.code }));
}

export function isSemanticCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const commonFields = {
  attemptId: z.string().superRefine((value, context) => {
    try { assertAttemptId(value); } catch { context.addIssue({ code: "custom", message: "invalid attemptId" }); }
  }),
  applicant: z.object({
    name: trimmed(100).refine((value) => value.length >= 2),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(20).refine((value) => /^010\d{8}$/.test(value.replace(/\D/g, ""))),
  }).strict(),
  collectionMethod: z.enum(["self_ship", "visit"]),
  shipping: z.object({
    postalCode: z.string().trim().max(5),
    address: z.string().trim().max(200),
    addressDetail: z.string().trim().max(200),
  }).strict(),
  work: z.object({
    racketType: trimmed(100).optional(),
    tensionMain: trimmed(4),
    tensionCross: trimmed(4),
    note: optionalTrimmed(500),
    preferredDate: optionalTrimmed(10),
    preferredTime: optionalTrimmed(5),
  }).strict(),
};

function withCollectionGuards<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.strict().superRefine((value: any, context) => {
  if (value.collectionMethod === "self_ship") {
    if (!/^\d{5}$/.test(value.shipping.postalCode)) context.addIssue({ code: "custom", path: ["shipping", "postalCode"], message: "invalid postalCode" });
    if (!value.shipping.address) context.addIssue({ code: "custom", path: ["shipping", "address"], message: "address required" });
    if (!value.shipping.addressDetail) context.addIssue({ code: "custom", path: ["shipping", "addressDetail"], message: "addressDetail required" });
  }
  if (value.collectionMethod === "visit") {
    if (!isSemanticCalendarDate(value.work.preferredDate)) context.addIssue({ code: "custom", path: ["work", "preferredDate"], message: "preferredDate required" });
    if (!/^\d{2}:\d{2}$/.test(value.work.preferredTime)) context.addIssue({ code: "custom", path: ["work", "preferredTime"], message: "preferredTime required" });
  }
  });
}

export const AppsStringingPaymentPrepareRequestSchema = withCollectionGuards(z.object({
  ...commonFields,
  purpose: z.literal("stringing_service").optional(),
  productId: z.string().refine((value) => ObjectId.isValid(value), "invalid productId"),
  selectedColor: trimmed(100), selectedGauge: trimmed(100),
  work: (commonFields.work as z.ZodObject<any>).extend({ racketType: trimmed(100) }),
}));
export const AppsRacketPurchasePrepareRequestSchema = withCollectionGuards(z.object({
  ...commonFields,
  purpose: z.literal("racket_purchase"),
  racketId: z.string().refine((value) => ObjectId.isValid(value), "invalid racketId"),
  productId: z.never().optional(),
  stringProductId: z.string().refine((value) => ObjectId.isValid(value), "invalid stringProductId"),
  selectedColor: trimmed(100), selectedGauge: trimmed(100), quantity: z.number().int().min(1).max(10),
}));
export const AppsPaymentPrepareRequestSchema = z.union([AppsStringingPaymentPrepareRequestSchema, AppsRacketPurchasePrepareRequestSchema]);

export type AppsPaymentPrepareRequest = z.infer<typeof AppsPaymentPrepareRequestSchema>;
export type AppsStringingPaymentPrepareRequest = {
  attemptId: string; purpose?: "stringing_service"; productId: string; selectedColor: string; selectedGauge: string;
  applicant: { name: string; email: string; phone: string }; collectionMethod: "self_ship" | "visit";
  shipping: { postalCode: string; address: string; addressDetail: string };
  work: { racketType: string; tensionMain: string; tensionCross: string; note: string; preferredDate: string; preferredTime: string };
};
export type AppsRacketPurchasePrepareRequest = z.infer<typeof AppsRacketPurchasePrepareRequestSchema>;

export function normalizeAppsPaymentPrepareRequest(value: unknown): AppsStringingPaymentPrepareRequest {
  return canonicalizeAppsPaymentPrepareRequest(AppsStringingPaymentPrepareRequestSchema.parse(value) as unknown as AppsStringingPaymentPrepareRequest);
}

export function canonicalizeAppsPaymentPrepareRequest<T extends AppsPaymentPrepareRequest>(request: T): T {
  if (request.collectionMethod !== "visit") return request;
  return { ...request, shipping: { postalCode: "", address: "", addressDetail: "" } };
}

export function isPastVisitSlot(preferredDate: string, preferredTime: string, now: Date) {
  return new Date(`${preferredDate}T${preferredTime}:00+09:00`).getTime() <= now.getTime();
}

export function isSameAppsPaymentPayload(
  checkout: { items: Array<{ productId?: string; kind?: string; quantity?: number; selectedColor?: string; selectedGauge?: string }>; applicant: unknown; collectionMethod: string; shipping: unknown; work: unknown },
  request: AppsPaymentPrepareRequest,
) {
  if (request.purpose === "racket_purchase") return checkout.items.length === 2 &&
    checkout.items[0]?.kind === "racket" && checkout.items[0].productId === request.racketId && checkout.items[0].quantity === request.quantity &&
    checkout.items[1]?.kind === "product" && checkout.items[1].productId === request.stringProductId && checkout.items[1].quantity === request.quantity &&
    checkout.items[1].selectedColor === request.selectedColor && checkout.items[1].selectedGauge === request.selectedGauge &&
    checkout.collectionMethod === request.collectionMethod && JSON.stringify(checkout.applicant) === JSON.stringify(request.applicant) &&
    (request.collectionMethod === "visit" || JSON.stringify(checkout.shipping) === JSON.stringify(request.shipping)) && JSON.stringify(checkout.work) === JSON.stringify(request.work);
  const item = checkout.items[0];
  return checkout.items.length === 1 && item?.productId === request.productId &&
    item.selectedColor === request.selectedColor && item.selectedGauge === request.selectedGauge &&
    checkout.collectionMethod === request.collectionMethod &&
    JSON.stringify(checkout.applicant) === JSON.stringify(request.applicant) &&
    (request.collectionMethod === "visit" || JSON.stringify(checkout.shipping) === JSON.stringify(request.shipping)) &&
    JSON.stringify(checkout.work) === JSON.stringify(request.work);
}

export function isAppsPaymentIntentExpired(expiresAt: Date, now: Date = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

type SafePaymentIntent = {
  attemptId: string; state: string; expiresAt: Date;
  itemSnapshot: Array<{ name: string; quantity: number }>;
  pricingSnapshot: { subtotal: number; shippingFee: number; serviceFeeBeforePackage?: number; serviceFee: number; payableAmount: number };
  packageSnapshot?: { applied: boolean };
};

export function createSafePaymentIntentResponse(intent: SafePaymentIntent, now: Date = new Date()) {
  const expired = isAppsPaymentIntentExpired(intent.expiresAt, now);
  const item = intent.itemSnapshot[0];
  const serviceFeeBeforePackage = intent.pricingSnapshot.serviceFeeBeforePackage ?? intent.pricingSnapshot.serviceFee;
  return { success: true as const, attemptId: intent.attemptId, state: intent.state,
    paymentReady: intent.state === "awaiting_authorization" && !expired, expired,
    paymentSummary: {
      item: { name: item.name, quantity: item.quantity },
      pricing: { subtotal: intent.pricingSnapshot.subtotal, shippingFee: intent.pricingSnapshot.shippingFee,
        serviceFeeBeforePackage, serviceFee: intent.pricingSnapshot.serviceFee,
        packageDiscount: Math.max(0, serviceFeeBeforePackage - intent.pricingSnapshot.serviceFee),
        payableAmount: intent.pricingSnapshot.payableAmount },
      packageApplied: intent.packageSnapshot?.applied === true,
    },
  };
}
