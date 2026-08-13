import { Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useState } from "react";

import { getRacketAvailability, getRacketDetail } from "../api/rackets";
import { formatPrice } from "../lib/product-labels";
import { getRacketRentalAvailability, RACKET_RENTAL_AVAILABILITY_MESSAGES } from "../lib/racket-rental-availability";
import { gripSizeLabel, racketBrandLabel, racketConditionLabel, stringPatternLabel, validRacketSalePrice } from "../lib/racket-labels";
import type { RacketAvailability, RacketDetail as RacketDetailType } from "../types/racket";

export default function RacketDetail({ racketId, onBack, onPurchase, onRental }: { racketId: string; onBack: () => void; onPurchase: () => void; onRental: () => void }) {
  const [racket, setRacket] = useState<RacketDetailType | null>(null);
  const [availability, setAvailability] = useState<RacketAvailability | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [imageIndex, setImageIndex] = useState(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const [detail, stock] = await Promise.all([getRacketDetail(racketId, signal), getRacketAvailability(racketId, signal)]);
      if (signal?.aborted) return;
      setRacket(detail); setAvailability(stock); setImageIndex(0); setState("success");
    } catch (error) { if (signal?.aborted) return; console.error("[라켓 상세 조회 실패]", error); setState("error"); }
  }, [racketId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  if (state === "loading") return <main className="min-h-dvh bg-white px-6 pt-[calc(24px+env(safe-area-inset-top))]" aria-label="라켓 상세 정보를 불러오는 중"><div className="aspect-square rounded-3xl bg-[#f2f4f6]" /><div className="mt-6 h-5 rounded bg-[#f2f4f6]" /></main>;
  if (state === "error" || !racket || !availability) return <main className="min-h-dvh bg-white px-6 pt-[calc(32px+env(safe-area-inset-top))]"><div role="alert" className="rounded-[20px] bg-[#f2f4f6] p-6 text-center"><b>라켓 정보를 불러오지 못했어요.</b><p className="text-sm text-[#6b7684]">상품이 없거나 네트워크 연결이 불안정해요.</p><button type="button" className="mr-2 min-h-11 rounded-xl border border-[#d1d6db] bg-white px-4 font-bold" onClick={onBack}>목록으로</button><button type="button" className="min-h-11 rounded-xl border-0 bg-[#e9f6c9] px-4 font-bold" onClick={() => void load()}>다시 시도</button></div></main>;

  const images = (racket.images ?? []).filter(Boolean);
  const price = Number.isFinite(racket.price) && Number(racket.price) >= 0 ? Number(racket.price) : null;
  const salePrice = validRacketSalePrice(price ?? undefined, racket.marketing);
  const displayPrice = salePrice ?? price;
  const saleEnded = racket.status === "sold" || availability.quantity <= 0;
  const hasValidSalePrice = displayPrice !== null && Number.isFinite(displayPrice) && displayPrice > 0;
  const canPurchase = availability.available > 0 && hasValidSalePrice && !saleEnded;
  const rentalReason = getRacketRentalAvailability(racket, availability);
  const canRent = rentalReason === "available";
  const rentalAvailabilityLabel = canRent ? "대여 가능" : RACKET_RENTAL_AVAILABILITY_MESSAGES[rentalReason];
  const reviewCount = Math.max(0, racket.reviewSummary?.count ?? racket.reviewCount ?? racket.ratingCount ?? 0);
  const rating = Math.max(0, racket.reviewSummary?.average ?? racket.ratingAvg ?? racket.ratingAverage ?? 0);
  const availabilityLabel = saleEnded ? "판매 종료" : availability.available <= 0 && availability.count > 0 ? "전량 대여 중" : availability.available > 0 ? `구매 가능한 재고 ${availability.available}개` : "현재 구매 불가";
  const specs = [
    ["무게", racket.spec?.weight, "g"], ["밸런스", racket.spec?.balance, "mm"], ["헤드사이즈", racket.spec?.headSize, "in²"],
    ["스트링 패턴", racket.spec?.pattern ? stringPatternLabel(String(racket.spec.pattern)) : null, ""],
    ["그립 사이즈", racket.spec?.gripSize ? gripSizeLabel(String(racket.spec.gripSize)) : null, ""], ["길이", racket.spec?.lengthIn, "in"],
    ["스윙웨이트", racket.spec?.swingWeight, ""], ["강성", racket.spec?.stiffnessRa, "RA"],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return <main className="min-h-dvh bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
    <section className="pt-[calc(16px+env(safe-area-inset-top))]"><Top title={<Top.TitleParagraph size={22}>라켓 상세</Top.TitleParagraph>} /></section>
    <section className="px-6 max-[359px]:px-5"><button type="button" onClick={onBack} className="mb-4 border-0 bg-transparent p-0 text-sm font-bold text-[#688d00]">목록으로</button>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-[#f2f4f6]">{images[imageIndex] ? <img src={images[imageIndex]} alt={`${racketBrandLabel(racket.brand)} ${racket.model ?? "라켓"}`} className="h-full w-full object-contain" /> : <span className="text-sm text-[#8b95a1]">이미지 준비 중</span>}</div>
      {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setImageIndex(index)} aria-label={`${index + 1}번째 이미지 보기`} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-[#f2f4f6] p-0 ${index === imageIndex ? "border-[#688d00]" : "border-[#e5e8eb]"}`}><img src={image} alt="" className="h-full w-full object-contain" /></button>)}</div>}
      <p className="mt-6 mb-1 text-sm font-bold text-[#8b95a1]">{racketBrandLabel(racket.brand)}</p><h1 className="m-0 break-words text-[25px] leading-[1.3] font-extrabold">{racket.model ?? "모델명 확인 중"}</h1>
      <p className="mt-2 text-sm text-[#6b7684]">{racketConditionLabel(racket.condition)}{reviewCount > 0 ? ` · ★ ${rating.toFixed(1)} (${reviewCount})` : ""}</p>
      <div className="mt-4">{salePrice !== null && price !== null && <span className="mr-2 text-sm text-[#8b95a1] line-through">{formatPrice(price)}</span>}<strong className="text-2xl">{price === null ? "가격 확인 중" : formatPrice(salePrice ?? price)}</strong></div>
      <dl className="mt-6 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-[#f7f8fa] p-4"><dt className="text-xs text-[#8b95a1]">배송비</dt><dd className="mt-1 ml-0 text-sm font-bold">{Number(racket.shippingFee ?? 0) > 0 ? formatPrice(Number(racket.shippingFee)) : "무료배송"}</dd></div><div className="rounded-2xl bg-[#f7f8fa] p-4"><dt className="text-xs text-[#8b95a1]">가용 상태</dt><dd className="mt-1 ml-0 text-sm font-bold">{availabilityLabel}</dd></div></dl>
      {racket.rental?.enabled && <section className="mt-7"><h2 className="text-xl font-extrabold">대여 정보</h2><div className="rounded-[20px] bg-[#f7f8fa] p-4 text-sm leading-7"><p className="m-0">7일 {formatPrice(Number(racket.rental.fee?.d7 ?? 0))}</p><p className="m-0">15일 {formatPrice(Number(racket.rental.fee?.d15 ?? 0))}</p><p className="m-0">30일 {formatPrice(Number(racket.rental.fee?.d30 ?? 0))}</p><p className="mt-2 mb-0 font-bold">보증금 {formatPrice(Number(racket.rental.deposit ?? 0))}</p></div></section>}
      {specs.length > 0 && <section className="mt-7"><h2 className="text-xl font-extrabold">상세 스펙</h2><dl className="divide-y divide-[#e5e8eb]">{specs.map(([label, value, unit]) => <div key={String(label)} className="flex justify-between gap-4 py-3 text-sm"><dt>{label}</dt><dd className="m-0 text-right font-bold text-[#4e5968]">{String(value)}{unit ? ` ${unit}` : ""}</dd></div>)}</dl></section>}
      <section className="mt-8" aria-label="라켓 구매">
        <button type="button" disabled={!canPurchase} onClick={onPurchase} className="min-h-[54px] w-full rounded-2xl border-0 bg-[#191f28] px-5 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]">스트링 선택 후 구매</button>
        <p className="mt-2 mb-0 text-center text-sm leading-6 text-[#6b7684]">{canPurchase ? "라켓·스트링·장착서비스를 하나의 주문으로 진행합니다." : availabilityLabel}</p>
      </section>
      <section className="mt-3" aria-label="라켓 대여"><button type="button" disabled={!canRent} onClick={onRental} className="min-h-[54px] w-full rounded-2xl border-2 border-[#688d00] bg-[#f4f9e8] px-5 text-base font-extrabold text-[#344700] disabled:border-[#e5e8eb] disabled:text-[#8b95a1]">라켓 대여하기</button><p className="mt-2 text-center text-sm text-[#6b7684]">{rentalAvailabilityLabel}</p></section>
    </section>
  </main>;
}
