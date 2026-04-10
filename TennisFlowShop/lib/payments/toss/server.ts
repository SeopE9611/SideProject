import { Buffer } from "node:buffer";

export function createTossOrderId() {
  return `tosspay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildTossOrderName(items: Array<{ name?: string; quantity?: number }>) {
  const first = (items[0]?.name || "주문 상품").trim();
  const extraCount = Math.max(0, items.length - 1);
  return extraCount > 0 ? `${first} 외 ${extraCount}건` : first;
}

export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const secretKey = process.env.TOSS_WIDGET_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_WIDGET_SECRET_KEY is required");
  }

  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    const message = typeof json?.message === "string" ? json.message : "토스 승인에 실패했습니다.";
    throw new Error(message);
  }

  return json as {
    paymentKey: string;
    method?: string;
    type?: string;
    orderId: string;
    approvedAt?: string;
    totalAmount?: number;
    card?: { number?: string; issuerCode?: string; acquirerCode?: string };
    easyPay?: { provider?: string; amount?: number; discountAmount?: number };
  };
}
