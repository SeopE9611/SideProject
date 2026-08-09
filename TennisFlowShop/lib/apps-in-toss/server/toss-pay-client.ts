import "server-only";

import { getAppsInTossTossPayMode } from "./config";
import { requestTossJson } from "./http";
import {
  assertRefundReason, assertTossPayOrderNo, parseExecutePaymentResponse, parseMakePaymentInput,
  parseMakePaymentResponse, parsePaymentStatusResponse, parseRefundPaymentResponse,
} from "./toss-pay-contract";

function headers(userKey: string) {
  if (!userKey.trim()) throw new Error("검증된 Apps in Toss 사용자 키가 필요합니다.");
  return { "x-toss-user-key": userKey };
}
async function post(path: string, userKey: string, body: Record<string, unknown>) {
  return requestTossJson({ method: "POST", path, headers: headers(userKey), body });
}
export async function makeTossPayPayment(userKey: string, input: unknown) {
  const body = parseMakePaymentInput(input); const { isTestPayment } = getAppsInTossTossPayMode();
  return parseMakePaymentResponse(await post("/api-partner/v1/apps-in-toss/pay/make-payment", userKey, { ...body, isTestPayment }));
}
export async function executeTossPayPayment(userKey: string, input: { payToken: string; orderNo: string }) {
  assertTossPayOrderNo(input.orderNo); const { isTestPayment } = getAppsInTossTossPayMode();
  return parseExecutePaymentResponse(await post("/api-partner/v1/apps-in-toss/pay/execute-payment", userKey, { ...input, isTestPayment }));
}
export async function getTossPayPaymentStatus(userKey: string, input: { payToken: string; orderNo: string }) {
  assertTossPayOrderNo(input.orderNo); const { isTestPayment } = getAppsInTossTossPayMode();
  return parsePaymentStatusResponse(await post("/api-partner/v1/apps-in-toss/pay/get-payment-status", userKey, { ...input, isTestPayment }));
}
export async function refundTossPayPayment(userKey: string, input: { payToken: string; reason: string }) {
  assertRefundReason(input.reason); const { isTestPayment } = getAppsInTossTossPayMode();
  return parseRefundPaymentResponse(await post("/api-partner/v1/apps-in-toss/pay/refund-payment", userKey, { ...input, isTestPayment }));
}
