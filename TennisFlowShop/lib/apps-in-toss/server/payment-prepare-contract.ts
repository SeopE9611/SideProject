import { ObjectId } from "mongodb";
import { z } from "zod";

import { assertAttemptId } from "./toss-pay-contract";

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optionalTrimmed = (max: number) => z.string().trim().max(max).optional().default("");

export const AppsPaymentPrepareRequestSchema = z.object({
  attemptId: z.string().superRefine((value, context) => {
    try { assertAttemptId(value); } catch { context.addIssue({ code: "custom", message: "invalid attemptId" }); }
  }),
  productId: z.string().refine((value) => ObjectId.isValid(value), "invalid productId"),
  selectedColor: trimmed(100),
  selectedGauge: trimmed(100),
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
    racketType: trimmed(100),
    tensionMain: trimmed(4),
    tensionCross: trimmed(4),
    note: optionalTrimmed(500),
    preferredDate: optionalTrimmed(10),
    preferredTime: optionalTrimmed(5),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.collectionMethod === "self_ship") {
    if (!/^\d{5}$/.test(value.shipping.postalCode)) context.addIssue({ code: "custom", path: ["shipping", "postalCode"], message: "invalid postalCode" });
    if (!value.shipping.address) context.addIssue({ code: "custom", path: ["shipping", "address"], message: "address required" });
    if (!value.shipping.addressDetail) context.addIssue({ code: "custom", path: ["shipping", "addressDetail"], message: "addressDetail required" });
  }
  if (value.collectionMethod === "visit") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.work.preferredDate)) context.addIssue({ code: "custom", path: ["work", "preferredDate"], message: "preferredDate required" });
    if (!/^\d{2}:\d{2}$/.test(value.work.preferredTime)) context.addIssue({ code: "custom", path: ["work", "preferredTime"], message: "preferredTime required" });
  }
});

export type AppsPaymentPrepareRequest = z.infer<typeof AppsPaymentPrepareRequestSchema>;

export function normalizeAppsPaymentPrepareRequest(value: unknown): AppsPaymentPrepareRequest {
  return AppsPaymentPrepareRequestSchema.parse(value);
}

export function isSameAppsPaymentPayload(
  checkout: { items: Array<{ productId: string; selectedColor: string; selectedGauge: string }>; applicant: unknown; collectionMethod: string; shipping: unknown; work: unknown },
  request: AppsPaymentPrepareRequest,
) {
  const item = checkout.items[0];
  return checkout.items.length === 1 && item?.productId === request.productId &&
    item.selectedColor === request.selectedColor && item.selectedGauge === request.selectedGauge &&
    checkout.collectionMethod === request.collectionMethod &&
    JSON.stringify(checkout.applicant) === JSON.stringify(request.applicant) &&
    JSON.stringify(checkout.shipping) === JSON.stringify(request.shipping) &&
    JSON.stringify(checkout.work) === JSON.stringify(request.work);
}

export function createSafePaymentIntentResponse(attemptId: string, state: string) {
  return { success: true as const, attemptId, state, paymentReady: state === "awaiting_authorization" };
}
