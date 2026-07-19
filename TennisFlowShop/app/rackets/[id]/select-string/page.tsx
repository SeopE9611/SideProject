import { racketVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import SiteContainer from "@/components/layout/SiteContainer";
import LoginGate from "@/components/system/LoginGate";
import { verifyAccessToken } from "@/lib/auth.utils";
import { racketBrandLabel } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import Link from "next/link";
import { PublicPageHero, ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";
import RacketSelectStringClient from "./RacketSelectStringClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라켓 스트링 선택",
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

export const dynamic = "force-dynamic";

type Params = { id: string };

function RacketSelectionBlockedResult({
  id,
  reasonLabel,
}: {
  id?: string;
  reasonLabel?: string;
}) {
  const isNotFound = !reasonLabel;

  return (
    <main className="min-h-screen bg-background pb-10">
      <PublicPageHero
        variant="feature"
        eyebrow="라켓 스트링 선택"
        title={isNotFound ? "라켓을 찾을 수 없습니다" : "현재 구매할 수 없는 라켓입니다"}
        description={
          isNotFound
            ? "요청하신 라켓이 없거나 현재 공개되어 있지 않습니다."
            : reasonLabel
        }
      />
      <SiteContainer variant="wide" className="pt-6">
        <ResultState
          status="warning"
          title={isNotFound ? "라켓 목록을 확인해 주세요" : "라켓 상세에서 상태를 확인해 주세요"}
          description={
            isNotFound
              ? "판매 중인 다른 라켓을 둘러보세요."
              : "판매 가능 상태가 되면 스트링을 선택할 수 있습니다."
          }
          actions={
            <>
              {!isNotFound && id && (
                <Button asChild className="rounded-control">
                  <Link href={`/rackets/${id}`}>라켓 상세로 돌아가기</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="rounded-control">
                <Link href="/rackets">라켓 목록으로 이동</Link>
              </Button>
            </>
          }
        />
      </SiteContainer>
    </main>
  );
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;

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
      const next = `/rackets/${id}/select-string`;
      return <LoginGate next={next} variant="checkout" />;
    }
  }

  const db = (await clientPromise).db();
  const viewer = await getVisibilityViewerFromCookies();

  if (!ObjectId.isValid(id)) {
    return <RacketSelectionBlockedResult />;
  }
  const racketObjectId = new ObjectId(id);
  const doc: any = await db
    .collection("used_rackets")
    .findOne({ _id: racketObjectId, ...racketVisibilityFilterFor(viewer) });

  if (!doc) {
    return <RacketSelectionBlockedResult />;
  }

  // (가드) 라켓 구매 가능 여부: 대여중(판매 불가) / 판매완료 상태를 선택 단계에서 1차 차단
  // - createOrder(서버) 검증이 최종이지만, UX 상 여기서 먼저 막아주면 '장바구니/결제'까지 헛걸음을 줄임
  const rawQtyField = (doc as any).quantity;
  const hasStockQty = typeof rawQtyField === "number" && Number.isFinite(rawQtyField);
  const activeRentalCount = await db.collection("rental_orders").countDocuments({
    racketId: racketObjectId,
    status: { $in: ["paid", "out"] },
  });
  const baseQty = hasStockQty
    ? Math.max(0, Math.trunc(rawQtyField))
    : doc.status === "available"
      ? 1
      : 0;
  const sellableQty = Math.max(0, baseQty - activeRentalCount);

  if (sellableQty < 1) {
    const reasonLabel =
      activeRentalCount > 0
        ? "현재 대여중인 라켓이라 구매할 수 없습니다."
        : "현재 판매 가능한 상태가 아닙니다.";
    return <RacketSelectionBlockedResult id={id} reasonLabel={reasonLabel} />;
  }

  const discountRate = getRacketDiscountRate(doc);
  const racket = {
    id: String(doc._id),
    name: `${racketBrandLabel(doc.brand)} ${doc.model}`.trim(),
    price: getEffectiveRacketPrice(doc),
    regularPrice: Number(doc.price ?? 0),
    salePrice: discountRate > 0 ? getEffectiveRacketPrice(doc) : undefined,
    discountRate,
    image: Array.isArray(doc.images) ? doc.images[0] : undefined,
    status: doc.status,
    maxQty: sellableQty,
  };

  return <RacketSelectStringClient racket={racket} />;
}
