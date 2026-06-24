import SelectStringClient from "@/app/racket-orders/[orderId]/select-string/SelectStringClient";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth.utils";
import { cookies } from "next/headers";
import LoginGate from "@/components/system/LoginGate";
import { Badge } from "@/components/ui/badge";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라켓 주문 스트링 선택",
};

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

type PageProps = { params: Promise<{ orderId: string }> };

export default async function SelectStringPage({ params }: PageProps) {
  const { orderId } = await params;

  // orderId 형식 검증 (24자/hex 형태가 아니면 즉시 404)
  if (!ObjectId.isValid(orderId)) notFound();

  const guestOrderMode = (
    process.env.GUEST_ORDER_MODE ??
    process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ??
    "legacy"
  ).trim();
  const allowGuestCheckout = guestOrderMode === "on";

  if (!allowGuestCheckout) {
    const token = (await cookies()).get("accessToken")?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const next = `/racket-orders/${orderId}/select-string`;
      return <LoginGate next={next} variant="checkout" />;
    }
  }

  // 주문 존재 여부 + 라켓 항목 포함 여부 확인
  const db = (await clientPromise).db();
  // projection으로 필요한 필드만 가져와 성능·보안 모두 이점
  const order = await db
    .collection("orders")
    .findOne({ _id: new ObjectId(orderId) }, { projection: { items: 1 } });

  if (!order) notFound();

  const hasRacket =
    Array.isArray(order.items) && order.items.some((it: any) => it?.kind === "racket");

  // 라켓 구매 주문이 아니면 선택 모드로 올 수 없음
  if (!hasRacket) notFound();

  const racketItem = order.items.find((it: any) => it?.kind === "racket");
  const racketName = String(racketItem?.name ?? "주문 라켓");
  const racketQuantity = typeof racketItem?.quantity === "number" ? racketItem.quantity : undefined;
  const racketPrice = typeof racketItem?.price === "number" ? racketItem.price : undefined;

  // 통과: 기존 화면 렌더
  return (
    <div className="container mx-auto space-y-5 px-4 py-6 md:px-6 md:py-8">
      <div className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <Badge variant="secondary" className="rounded-full">
            라켓 주문 스트링 선택
          </Badge>
          <h1 className="break-keep text-2xl font-semibold tracking-tight md:text-3xl">
            주문 라켓에 장착할 스트링을 선택하세요
          </h1>
          <p className="break-keep text-sm leading-relaxed text-muted-foreground">
            기존 라켓 주문에 연결할 스트링과 옵션을 선택한 뒤 장착 정보 입력 단계로 진행합니다.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">주문 라켓</p>
              <h2 className="break-keep text-base font-semibold text-foreground md:text-lg">
                {racketName}
              </h2>
              <p className="break-all font-mono text-xs text-muted-foreground">
                주문 ID: {orderId}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm md:min-w-56">
              {racketQuantity != null && (
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">수량</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {racketQuantity.toLocaleString()}개
                  </p>
                </div>
              )}
              {racketPrice != null && (
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">라켓 금액</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {racketPrice.toLocaleString()}원
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            선택한 스트링은 위 주문 라켓과 연결되어 교체서비스 신청에 사용됩니다.
          </div>
        </section>
      </div>
      <SelectStringClient orderId={orderId} />
    </div>
  );
}
