import { Top } from "@toss/tds-mobile";
import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import { getRackets, type RacketListQuery } from "../api/rackets";
import { formatPrice } from "../lib/product-labels";
import { RACKET_BRANDS, racketBrandLabel, racketConditionLabel, validRacketSalePrice } from "../lib/racket-labels";
import type { RacketListItem } from "../types/racket";

export type RacketCatalogState = {
  items: RacketListItem[];
  total: number;
  status: "idle" | "loading" | "success" | "error";
  searchInput: string;
  query: RacketListQuery;
};

export const initialRacketCatalogState: RacketCatalogState = {
  items: [],
  total: 0,
  status: "idle",
  searchInput: "",
  query: { page: 1, limit: 12, sort: "latest" },
};

type Props = {
  catalog: RacketCatalogState;
  setCatalog: Dispatch<SetStateAction<RacketCatalogState>>;
  onHome: () => void;
  onSelect: (id: string) => void;
};

function Skeleton() {
  return <div aria-hidden="true"><div className="aspect-square rounded-[18px] bg-[#f2f4f6]" /><div className="mt-3 h-3 w-2/3 rounded bg-[#f2f4f6]" /><div className="mt-2 h-4 rounded bg-[#f2f4f6]" /></div>;
}

function Card({ racket, onSelect }: { racket: RacketListItem; onSelect: (id: string) => void }) {
  const price = Number.isFinite(racket.price) && Number(racket.price) >= 0 ? Number(racket.price) : null;
  const salePrice = validRacketSalePrice(price ?? undefined, racket.marketing);
  const reviewCount = Math.max(0, racket.reviewCount ?? racket.ratingCount ?? 0);
  const rating = Math.max(0, racket.ratingAvg ?? racket.ratingAverage ?? 0);
  return <button type="button" className="min-w-0 border-0 bg-transparent p-0 text-left" onClick={() => onSelect(racket.id)}>
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[18px] bg-[#f2f4f6]">
      {racket.images?.[0] ? <img src={racket.images[0]} alt={`${racketBrandLabel(racket.brand)} ${racket.model ?? "라켓"}`} className="h-full w-full object-contain" /> : <span className="text-xs text-[#8b95a1]">이미지 준비 중</span>}
    </div>
    <p className="mt-3 mb-1 truncate text-xs font-bold text-[#8b95a1]">{racketBrandLabel(racket.brand)}</p>
    <strong className="block line-clamp-2 min-h-10 break-words text-[15px] leading-5 text-[#191f28]">{racket.model ?? "모델명 확인 중"}</strong>
    <p className="mt-1.5 mb-0 text-xs text-[#6b7684]">{racketConditionLabel(racket.condition)}{racket.rental?.enabled ? " · 대여 지원" : ""}</p>
    <div className="mt-2">{salePrice !== null && price !== null && <span className="mr-1.5 text-xs text-[#8b95a1] line-through">{formatPrice(price)}</span>}<strong className="text-[15px]">{price === null ? "가격 확인 중" : formatPrice(salePrice ?? price)}</strong></div>
    {reviewCount > 0 && <p className="mt-1 mb-0 text-xs text-[#6b7684]">★ {rating.toFixed(1)} ({reviewCount})</p>}
  </button>;
}

export default function RacketCatalogScreen({ catalog, setCatalog, onHome, onSelect }: Props) {
  const [loadingMore, setLoadingMore] = useState(false);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const queryRef = useRef(catalog.query);

  const load = useCallback(async (next: RacketListQuery, append: boolean) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;
    append ? setLoadingMore(true) : setCatalog((current) => ({ ...current, status: "loading" }));
    try {
      const result = await getRackets(next, controller.signal);
      if (controller.signal.aborted || requestId !== requestRef.current) return;
      setCatalog((current) => {
        const items = append ? Array.from(new Map([...current.items, ...result.items].map((item) => [item.id, item])).values()) : result.items;
        if (append) queryRef.current = next;
        return {
          ...current,
          items,
          total: Math.max(0, result.total),
          status: "success",
          query: append ? next : current.query,
        };
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("[라켓 목록 조회 실패]", error);
      if (!append) setCatalog((current) => ({ ...current, items: [], total: 0, status: "error" }));
    } finally { if (requestId === requestRef.current) setLoadingMore(false); }
  }, [setCatalog]);

  useEffect(() => {
    if (catalog.status === "idle") void load(queryRef.current, false);
    return () => controllerRef.current?.abort();
  }, [load]);
  const update = (changes: Partial<RacketListQuery>) => {
    const next = { ...queryRef.current, ...changes, page: 1 };
    queryRef.current = next;
    setCatalog((current) => ({ ...current, query: next }));
    void load(next, false);
  };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); update({ q: catalog.searchInput }); };

  return <main className="min-h-dvh bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
    <section className="pt-[calc(16px+env(safe-area-inset-top))]"><Top title={<Top.TitleParagraph size={22}>중고 라켓</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>검수된 라켓을 조건별로 둘러보세요</Top.SubtitleParagraph>} /></section>
    <section className="px-6 max-[359px]:px-5">
      <button type="button" className="mb-5 border-0 bg-transparent p-0 text-sm font-bold text-[#688d00]" onClick={onHome}>홈으로</button>
      <form className="flex gap-2" onSubmit={submitSearch}><input aria-label="브랜드 또는 모델 검색" value={catalog.searchInput} onChange={(e) => setCatalog((current) => ({ ...current, searchInput: e.target.value }))} placeholder="브랜드 또는 모델 검색" className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#d1d6db] px-3 text-sm" /><button className="rounded-xl border-0 bg-[#191f28] px-4 font-bold text-white">검색</button></form>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select aria-label="브랜드" className="min-h-11 rounded-xl border border-[#d1d6db] bg-white px-2 text-sm" value={catalog.query.brand ?? ""} onChange={(e) => update({ brand: e.target.value })}><option value="">모든 브랜드</option>{RACKET_BRANDS.map((brand) => <option key={brand.value} value={brand.value}>{brand.label}</option>)}</select>
        <select aria-label="상태" className="min-h-11 rounded-xl border border-[#d1d6db] bg-white px-2 text-sm" value={catalog.query.cond ?? ""} onChange={(e) => update({ cond: e.target.value as RacketListQuery["cond"] })}><option value="">모든 상태</option><option value="A">A · 최상</option><option value="B">B · 양호</option><option value="C">C · 보통</option></select>
        <select aria-label="정렬" className="min-h-11 rounded-xl border border-[#d1d6db] bg-white px-2 text-sm" value={catalog.query.sort} onChange={(e) => update({ sort: e.target.value as RacketListQuery["sort"] })}><option value="latest">최신순</option><option value="price-low">낮은 가격순</option><option value="price-high">높은 가격순</option></select>
        <label className="flex min-h-11 items-center gap-2 rounded-xl bg-[#f2f4f6] px-3 text-sm"><input type="checkbox" checked={catalog.query.rentOnly ?? false} onChange={(e) => update({ rentOnly: e.target.checked })} />대여 지원만</label>
      </div>
      {catalog.status === "loading" && <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6" aria-label="라켓을 불러오는 중">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} />)}</div>}
      {catalog.status === "error" && <div role="alert" className="mt-6 rounded-[20px] bg-[#f2f4f6] p-6 text-center"><b>라켓을 불러오지 못했어요.</b><p className="text-sm text-[#6b7684]">네트워크 상태를 확인해주세요.</p><button type="button" onClick={() => void load(queryRef.current, false)} className="min-h-11 rounded-xl border-0 bg-[#e9f6c9] px-4 font-bold">다시 시도</button></div>}
      {catalog.status === "success" && catalog.items.length === 0 && <p className="mt-6 rounded-[20px] bg-[#f2f4f6] p-6 text-center text-sm text-[#6b7684]">조건에 맞는 라켓이 없어요.</p>}
      {catalog.status === "success" && catalog.items.length > 0 && <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6">{catalog.items.map((item) => <Card key={item.id} racket={item} onSelect={onSelect} />)}</div>}
      {catalog.status === "success" && catalog.items.length < catalog.total && <button type="button" disabled={loadingMore} onClick={() => { const next = { ...queryRef.current, page: (queryRef.current.page ?? 1) + 1 }; void load(next, true); }} className="mt-8 min-h-12 w-full rounded-2xl border border-[#d1d6db] bg-white font-bold disabled:text-[#8b95a1]">{loadingMore ? "라켓을 더 불러오는 중..." : "라켓 더 보기"}</button>}
    </section>
  </main>;
}
