import { Top } from "@toss/tds-mobile";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getProductDetail, getStringingProducts } from "../api/products";
import { useProductDetailOptions } from "../hooks/useProductDetailOptions";
import { formatGaugeLabel, formatPrice, getStringColorLabel } from "../lib/product-labels";
import { racketBrandLabel, racketConditionLabel, validRacketSalePrice } from "../lib/racket-labels";
import { readPendingAppsPayment } from "../lib/pending-payment";
import type { Product } from "../types/product";
import type { RacketAvailability, RacketDetail } from "../types/racket";

export type RacketStringProductPickerProps = {
  mode: "racket-purchase" | "racket-rental";
  racket: RacketDetail;
  availability: RacketAvailability;
  quantity: number;
  stringProductId: string;
  stringProduct: Product | null;
  selectedColor: string;
  selectedGauge: string;
  errorMessage?: string;
  onQuantityChange?: (quantity: number) => void;
  onStringChange: (productId: string, product: Product | null, color: string, gauge: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

type ListState = "loading" | "success" | "error";
type DetailState = "idle" | "loading" | "success" | "error";

function productImage(product: Product) {
  return product.images?.[0] ?? product.image ?? product.imageUrl ?? product.thumbnail ?? null;
}

function isProductAvailable(product: Product) {
  if (product.inventory?.status === "outofstock") return false;
  if (product.variantInventories?.length) {
    return product.variantInventories.some((variant) => variant.isSoldOut !== true && Number(variant.stock ?? 0) > 0);
  }
  if (product.inventory?.manageStock === true) return Number(product.inventory.stock ?? 0) > 0;
  return true;
}

function StringOptions({
  product,
  quantity,
  initialColor,
  initialGauge,
  onChange,
}: {
  product: Product;
  quantity: number;
  initialColor: string;
  initialGauge: string;
  onChange: (color: string, gauge: string, valid: boolean) => void;
}) {
  const {
    hasVariantInventories,
    isSellableVariant,
    getVariantsByColor,
    visibleColorRows,
    selectedColor,
    setSelectedColor,
    selectedColorRow,
    gaugeRows,
    selectedGauge,
    setSelectedGauge,
    selectedVariantSoldOut,
    variantHasNoSellableGauge,
    effectiveStock,
  } = useProductDetailOptions(product, {
    selectedColor: initialColor,
    selectedGauge: initialGauge,
    requiredQuantity: quantity,
  });

  const valid = Boolean(selectedColor && selectedGauge && !selectedVariantSoldOut && !variantHasNoSellableGauge && effectiveStock >= quantity);

  useEffect(() => {
    onChange(selectedColor, selectedGauge, valid);
  }, [onChange, selectedColor, selectedGauge, valid]);

  return (
    <div className="mt-4 rounded-[20px] border border-[#e5e8eb] p-4">
      <strong className="block text-base font-extrabold">색상·게이지 선택</strong>
      {visibleColorRows.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">색상</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleColorRows.map((row) => {
              const variants = getVariantsByColor(row.value);
              const disabled = hasVariantInventories
                ? !variants.some((variant) => isSellableVariant(variant))
                : row.isSoldOut || row.stock < quantity;
              const selected = selectedColor === row.value;
              const label = getStringColorLabel(row.label || row.value);
              return (
                <button
                  key={row.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => setSelectedColor(row.value)}
                  className={`min-h-11 shrink-0 rounded-xl border px-3 text-sm font-bold ${selected ? "border-[#688d00] bg-[#f4f9e8]" : "border-[#d1d6db] bg-white"} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {gaugeRows.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">게이지</p>
          <div className="grid grid-cols-2 gap-2">
            {gaugeRows.map((row) => {
              const disabled = row.isSoldOut || row.stock < quantity;
              const selected = selectedGauge === row.value;
              return (
                <button
                  key={row.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => setSelectedGauge(row.value)}
                  className={`min-h-[52px] rounded-xl border px-3 text-left text-sm ${selected ? "border-[#688d00] bg-[#f4f9e8]" : "border-[#d1d6db] bg-white"} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <strong className="block">{row.label || formatGaugeLabel(row.value)}</strong>
                  <span className="mt-1 block text-xs text-[#6b7684]">{disabled ? `${quantity}개 주문 불가` : `재고 ${row.stock}개`}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className={`mt-3 mb-0 text-sm ${valid ? "text-[#4e5968]" : "font-semibold text-[#d92d20]"}`}>
        {valid
          ? `${getStringColorLabel(selectedColorRow?.label || selectedColor)} · ${formatGaugeLabel(selectedGauge)} · ${quantity}개 선택 가능`
          : "선택한 수량만큼 재고가 있는 색상·게이지를 선택해주세요."}
      </p>
    </div>
  );
}

export default function RacketStringProductPicker({
  mode,
  racket,
  availability,
  quantity,
  stringProductId,
  stringProduct,
  selectedColor,
  selectedGauge,
  errorMessage = "",
  onQuantityChange,
  onStringChange,
  onBack,
  onContinue,
}: RacketStringProductPickerProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false });
  const [listState, setListState] = useState<ListState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [detailState, setDetailState] = useState<DetailState>(stringProduct ? "success" : "idle");
  const [optionsValid, setOptionsValid] = useState(Boolean(stringProduct && selectedColor && selectedGauge));
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const listControllerRef = useRef<AbortController | null>(null);
  const detailControllerRef = useRef<AbortController | null>(null);
  const maxQuantity = Math.max(1, Math.min(availability.available, 10));
  const pending = readPendingAppsPayment();
  const isRental = mode === "racket-rental";

  const loadProducts = useCallback(async (page: number, append: boolean) => {
    listControllerRef.current?.abort();
    const controller = new AbortController();
    listControllerRef.current = controller;
    const requestId = ++listRequestRef.current;
    append ? setLoadingMore(true) : setListState("loading");
    try {
      const result = await getStringingProducts(controller.signal, { page, limit: 12, q: query });
      if (controller.signal.aborted || requestId !== listRequestRef.current) return;
      const available = result.products.filter(isProductAvailable);
      setItems((current) => {
        const merged = append ? [...current, ...available] : available;
        return Array.from(new Map(merged.map((product) => [product._id, product])).values());
      });
      setPagination({ page: result.pagination.page, hasMore: result.pagination.hasMore });
      setListState("success");
    } catch {
      if (!controller.signal.aborted && requestId === listRequestRef.current) setListState("error");
    } finally {
      if (requestId === listRequestRef.current) setLoadingMore(false);
    }
  }, [query]);

  useEffect(() => {
    void loadProducts(1, false);
    return () => listControllerRef.current?.abort();
  }, [loadProducts]);

  useEffect(() => () => detailControllerRef.current?.abort(), []);

  const selectProduct = async (productId: string) => {
    if (pending) return;
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    const requestId = ++detailRequestRef.current;
    setDetailState("loading");
    setOptionsValid(false);
    onStringChange(productId, null, "", "");
    try {
      const result = await getProductDetail(productId, controller.signal);
      if (controller.signal.aborted || requestId !== detailRequestRef.current) return;
      onStringChange(productId, result.product, "", "");
      setDetailState("success");
    } catch {
      if (!controller.signal.aborted && requestId === detailRequestRef.current) setDetailState("error");
    }
  };

  const onOptionsChange = useCallback((color: string, gauge: string, valid: boolean) => {
    setOptionsValid(valid);
    if (stringProduct) onStringChange(stringProduct._id, stringProduct, color, gauge);
  }, [onStringChange, stringProduct]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(searchInput.trim());
  };

  const racketPrice = Number(racket.price);
  const salePrice = validRacketSalePrice(racketPrice, racket.marketing);
  const displayPrice = salePrice ?? racketPrice;
  const racketImage = racket.images?.[0] ?? null;
  const canContinue = Boolean(stringProduct && stringProductId === stringProduct._id && optionsValid && quantity <= maxQuantity);
  const selectedIds = useMemo(() => new Set(stringProductId ? [stringProductId] : []), [stringProductId]);

  return (
    <main className="min-h-dvh bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top title={<Top.TitleParagraph size={22}>{isRental ? "라켓 대여" : "라켓 구매"}</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>{isRental ? "2 / 7 · 선택적 스트링" : "1 / 6 · 라켓 수량·스트링 선택"}</Top.SubtitleParagraph>} />
      </section>
      <section className="px-6 max-[359px]:px-5">
        <button type="button" className="mb-4 border-0 bg-transparent p-0 text-sm font-bold text-[#688d00]" onClick={onBack}>{isRental ? "이전" : "라켓 상세로"}</button>
        {errorMessage ? <p role="alert" className="rounded-2xl bg-[#fff4f2] p-4 text-sm font-semibold text-[#d92d20]">{errorMessage}</p> : null}
        {!isRental ? <>
        <div className="flex gap-3 rounded-[20px] bg-[#f7f8fa] p-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white">{racketImage ? <img src={racketImage} alt={`${racketBrandLabel(racket.brand)} ${racket.model ?? "라켓"}`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-[#8b95a1]">이미지 준비 중</div>}</div>
          <div className="min-w-0"><p className="m-0 text-xs font-bold text-[#8b95a1]">{racketBrandLabel(racket.brand)}</p><strong className="mt-1 block break-words">{racket.model}</strong><p className="mt-1 mb-0 text-sm text-[#6b7684]">{racketConditionLabel(racket.condition)}</p><p className="mt-2 mb-0 font-extrabold">{formatPrice(displayPrice)}</p><p className="mt-1 mb-0 text-xs text-[#688d00]">실제 가용수량 {availability.available}개</p></div>
        </div>

        <section className="mt-6" aria-labelledby="quantity-title">
          <h1 id="quantity-title" className="text-[22px] font-extrabold">구매 수량</h1>
          {maxQuantity === 1 ? <p className="rounded-2xl bg-[#f2f4f6] p-4 text-sm">구매 가능한 수량은 1개입니다.</p> : <div className="flex items-center justify-between rounded-2xl border border-[#e5e8eb] p-3"><span className="text-sm text-[#6b7684]">최대 {maxQuantity}개</span><div className="flex items-center gap-3"><button type="button" className="h-10 w-10 rounded-xl border border-[#d1d6db] bg-white text-xl" disabled={Boolean(pending) || quantity <= 1} onClick={() => onQuantityChange?.(quantity - 1)} aria-label="수량 줄이기">−</button><strong>{quantity}</strong><button type="button" className="h-10 w-10 rounded-xl border border-[#d1d6db] bg-white text-xl" disabled={Boolean(pending) || quantity >= maxQuantity} onClick={() => onQuantityChange?.(quantity + 1)} aria-label="수량 늘리기">+</button></div></div>}
        </section>
        </> : <p className="rounded-2xl bg-[#f4f9e8] p-4 text-sm text-[#4e5968]">선택한 대여 라켓 한 자루의 스트링을 선택해 교체서비스를 신청합니다.</p>}

        <section className="mt-8" aria-labelledby="string-list-title">
          <h2 id="string-list-title" className="text-[22px] font-extrabold">스트링 선택</h2>
          <p className="mt-1 text-sm leading-6 text-[#6b7684]">{isRental ? "대여 중 선택적으로 교체서비스를 신청할 스트링의 색상과 게이지를 선택해주세요." : "라켓 수량과 같은 수량의 스트링 및 장착서비스가 함께 주문됩니다."}</p>
          <form className="mt-4 flex gap-2" onSubmit={submitSearch}><input className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#d1d6db] px-3" aria-label="스트링 검색" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="스트링 이름 검색" /><button type="submit" className="rounded-xl border-0 bg-[#191f28] px-4 font-bold text-white">검색</button></form>
          {listState === "loading" ? <p role="status" className="rounded-2xl bg-[#f2f4f6] p-5 text-center text-sm">스트링을 불러오고 있어요.</p> : null}
          {listState === "error" ? <div role="alert" className="mt-4 rounded-2xl bg-[#fff4f2] p-5 text-center"><p className="m-0 text-sm">스트링 목록을 불러오지 못했어요.</p><button type="button" className="mt-3 min-h-10 rounded-xl border-0 bg-[#191f28] px-4 font-bold text-white" onClick={() => void loadProducts(1, false)}>다시 시도</button></div> : null}
          {listState === "success" && items.length === 0 ? <p className="rounded-2xl bg-[#f2f4f6] p-5 text-center text-sm text-[#6b7684]">조건에 맞는 판매 가능 스트링이 없어요.</p> : null}
          {listState === "success" && items.length ? <div className="mt-4 grid grid-cols-2 gap-3">{items.map((product) => <button key={product._id} type="button" aria-pressed={selectedIds.has(product._id)} className={`min-w-0 rounded-2xl border p-3 text-left ${selectedIds.has(product._id) ? "border-[#688d00] bg-[#f4f9e8]" : "border-[#e5e8eb] bg-white"}`} onClick={() => void selectProduct(product._id)}><div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f2f4f6]">{productImage(product) ? <img src={productImage(product)!} alt={product.name ?? "스트링"} className="h-full w-full object-contain" /> : <span className="text-xs text-[#8b95a1]">이미지 준비 중</span>}</div><strong className="mt-2 block line-clamp-2 text-sm">{product.name ?? "상품명 정보 없음"}</strong><span className="mt-1 block text-sm font-extrabold">{formatPrice(product.price)}</span></button>)}</div> : null}
          {listState === "success" && pagination.hasMore ? <button type="button" className="mt-4 min-h-12 w-full rounded-2xl border border-[#d1d6db] bg-white font-bold" disabled={loadingMore} onClick={() => void loadProducts(pagination.page + 1, true)}>{loadingMore ? "더 불러오는 중..." : "스트링 12개 더 보기"}</button> : null}
        </section>

        {detailState === "loading" ? <p role="status" className="mt-4 rounded-2xl bg-[#f2f4f6] p-4 text-sm">선택한 스트링의 옵션을 불러오고 있어요.</p> : null}
        {detailState === "error" ? <div role="alert" className="mt-4 rounded-2xl bg-[#fff4f2] p-4 text-sm"><p className="m-0">스트링 상세를 불러오지 못했어요.</p>{stringProductId ? <button type="button" className="mt-3 min-h-10 rounded-xl bg-[#191f28] px-4 font-bold text-white" onClick={() => void selectProduct(stringProductId)}>다시 시도</button> : null}</div> : null}
        {detailState === "success" && stringProduct ? <StringOptions key={`${stringProduct._id}:${quantity}`} product={stringProduct} quantity={quantity} initialColor={selectedColor} initialGauge={selectedGauge} onChange={onOptionsChange} /> : null}

        <div className="mt-6 grid grid-cols-[0.72fr_1.28fr] gap-2.5"><button type="button" className="min-h-[52px] rounded-2xl border border-[#d1d6db] bg-white font-bold" onClick={onBack}>이전</button><button type="button" className="min-h-[52px] rounded-2xl bg-[#191f28] font-extrabold text-white disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]" disabled={!canContinue} onClick={onContinue}>다음: 신청자 정보</button></div>
      </section>
    </main>
  );
}
