import type { AppsInTossPaymentIntentDocument } from "./payment-intents";
import { parseMakePaymentInput } from "./toss-pay-contract";

const FALLBACK_PRODUCT_DESCRIPTION = "도깨비테니스 교체서비스";

export function normalizeAppsTossPayProductDescription(value: string) {
  const normalized = value.replace(/[\\"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 255).trim();
  return normalized || FALLBACK_PRODUCT_DESCRIPTION;
}

export function buildAppsTossPayMakePaymentInput(intent: AppsInTossPaymentIntentDocument) {
  return parseMakePaymentInput({
    orderNo: intent.orderNo,
    productDesc: normalizeAppsTossPayProductDescription(intent.itemSnapshot[0]?.name ?? ""),
    amount: intent.pricingSnapshot.payableAmount,
    amountTaxFree: 0,
    cashReceipt: true,
    cashReceiptTradeOption: "GENERAL",
  });
}
