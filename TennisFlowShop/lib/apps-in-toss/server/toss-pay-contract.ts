import { randomUUID } from "node:crypto";
import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const money = z.number().int().nonnegative();
const tossPayAmount = z.number().int().nonnegative().max(9_999_999);
export const PayTokenSchema = z.string().min(1).max(30).refine((value) => value.trim().length > 0);
export const TOSS_PAY_KNOWN_STATUSES = [
  "PAY_STANDBY", "PAY_APPROVED", "PAY_CANCEL", "PAY_PROGRESS", "PAY_COMPLETE",
  "REFUND_PROGRESS", "REFUND_SUCCESS", "SETTLEMENT_COMPLETE", "SETTLEMENT_REFUND_COMPLETE",
] as const;

export class TossPayContractError extends Error {
  constructor() { super("Apps in Toss Toss Pay 계약 값이 올바르지 않습니다."); this.name = "TossPayContractError"; }
}

export function generateTossPayOrderNo() { return `dkt-${randomUUID()}`; }
export function isValidTossPayOrderNo(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 50 && /^[A-Za-z0-9_\-:.^@]+$/.test(value);
}
export function assertTossPayOrderNo(value: unknown): asserts value is string {
  if (!isValidTossPayOrderNo(value)) throw new TossPayContractError();
}
export function assertAttemptId(value: unknown): asserts value is string {
  if (!z.string().uuid().safeParse(value).success) throw new TossPayContractError();
}
export function isKnownTossPayStatus(value: string): value is (typeof TOSS_PAY_KNOWN_STATUSES)[number] {
  return (TOSS_PAY_KNOWN_STATUSES as readonly string[]).includes(value);
}

const ProductDescSchema = z.string().trim().min(1).max(255).refine((v) => !/[\\"]/.test(v));
const AmountSchema = z.object({
  amount: tossPayAmount.positive(), amountTaxFree: tossPayAmount,
  amountTaxable: tossPayAmount.optional(), amountVat: tossPayAmount.optional(),
}).refine((v) => v.amountTaxFree <= v.amount);
export const MakePaymentInputSchema = AmountSchema.and(z.object({
  orderNo: z.string(), productDesc: ProductDescSchema, cashReceipt: z.boolean(),
  cashReceiptTradeOption: z.enum(["GENERAL", "CULTURE", "PUBLIC_TP"]).optional(),
  installment: z.enum(["USE", "NOT_USE"]).optional(),
})).superRefine((v, ctx) => { if (!isValidTossPayOrderNo(v.orderNo)) ctx.addIssue({ code: "custom", message: "invalid orderNo" }); });

const FailureEnvelopeSchema = z.object({ resultType: z.string().min(1) }).passthrough();
const ExecuteSuccessSchema = z.object({
  resultType: z.literal("SUCCESS"), success: z.object({
    mode: nonEmpty, orderNo: nonEmpty, amount: money, approvalTime: nonEmpty, stateMsg: nonEmpty,
    discountedAmount: money, paidAmount: money, payMethod: nonEmpty, payToken: PayTokenSchema, transactionId: nonEmpty,
  }).passthrough(),
}).passthrough();
const TransactionSchema = z.object({}).passthrough();
const StatusSuccessSchema = z.object({
  resultType: z.literal("SUCCESS"), success: z.object({
    mode: nonEmpty, payToken: PayTokenSchema, orderNo: nonEmpty, payStatus: nonEmpty, payMethod: nonEmpty.nullable(),
    amount: money, discountedAmount: money, paidAmount: money, refundableAmount: money,
    amountTaxable: money, amountTaxFree: money, amountVat: money, transactions: z.array(TransactionSchema),
    createdTs: nonEmpty, paidTs: nonEmpty.nullable(),
  }).passthrough(),
}).passthrough();
const RefundSuccessSchema = z.object({
  resultType: z.literal("SUCCESS"), success: z.object({
    refundNo: nonEmpty, approvalTime: nonEmpty, refundableAmount: money, discountedAmount: money,
    paidAmount: money, refundedAmount: money, refundedDiscountAmount: money, refundedPaidAmount: money,
    payToken: PayTokenSchema, transactionId: nonEmpty,
  }).passthrough(),
}).passthrough();
const MakeSuccessSchema = z.object({ resultType: z.literal("SUCCESS"), success: z.object({ payToken: PayTokenSchema }).passthrough() }).passthrough();

export type TossPayParsedResult<T> = { kind: "success"; value: T } | { kind: "toss_failure"; resultType: string; errorCode?: string };
function parseEnvelope<T>(value: unknown, schema: z.ZodType<T>): TossPayParsedResult<T> {
  const success = schema.safeParse(value);
  if (success.success) return { kind: "success", value: success.data };
  const envelope = FailureEnvelopeSchema.safeParse(value);
  if (envelope.success && envelope.data.resultType !== "SUCCESS") {
    const error = "error" in envelope.data && typeof envelope.data.error === "object" && envelope.data.error !== null ? envelope.data.error : undefined;
    const errorCode = error && "errorCode" in error && typeof error.errorCode === "string" ? error.errorCode : undefined;
    return { kind: "toss_failure", resultType: envelope.data.resultType, ...(errorCode ? { errorCode } : {}) };
  }
  throw new TossPayContractError();
}
export const parseMakePaymentResponse = (v: unknown) => parseEnvelope(v, MakeSuccessSchema);
export const parseExecutePaymentResponse = (v: unknown) => parseEnvelope(v, ExecuteSuccessSchema);
export const parsePaymentStatusResponse = (v: unknown) => parseEnvelope(v, StatusSuccessSchema);
export const parseRefundPaymentResponse = (v: unknown) => parseEnvelope(v, RefundSuccessSchema);

export function parseMakePaymentInput(value: unknown) {
  const parsed = MakePaymentInputSchema.safeParse(value); if (!parsed.success) throw new TossPayContractError(); return parsed.data;
}
export function parseTossPayToken(value: unknown) {
  const parsed = PayTokenSchema.safeParse(value); if (!parsed.success) throw new TossPayContractError(); return parsed.data;
}
export function assertRefundReason(value: unknown): asserts value is string {
  // 공식 계약: 한글, 영문, 숫자와 _-:.^@()[]#/!%?& 문자를 허용한다.
  if (typeof value !== "string" || value.length === 0 || value.length > 55 || !/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_\-:.^@()[\]#/!%?&]+$/.test(value)) throw new TossPayContractError();
}
