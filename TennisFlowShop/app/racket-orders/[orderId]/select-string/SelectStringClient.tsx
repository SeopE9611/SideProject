"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { showErrorToast } from "@/lib/toast";

type GaugeInventoryRow = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
};

type ColorInventoryRow = {
  value: string;
  label?: string;
  colorHex?: string;
  image?: string;
  stock: number;
  isSoldOut: boolean;
};

type SelectableStringProduct = {
  _id: string;
  name?: string;
  price?: number;
  mountingFee?: number;
  gaugeOptions?: string[];
  gaugeInventories?: GaugeInventoryRow[];
  colorOptions?: string[];
  colorInventories?: ColorInventoryRow[];
  color?: string;
  inventory?: {
    stock?: number;
    status?: string;
    manageStock?: boolean;
    allowBackorder?: boolean;
    hideGaugeStock?: boolean;
  };
};

const REQUIRED_QUANTITY = 1;
// ... keep helpers
function normalizeGaugeRows(product: SelectableStringProduct): GaugeInventoryRow[] { /* unchanged */
  if (Array.isArray(product.gaugeInventories) && product.gaugeInventories.length > 0) {
    return product.gaugeInventories.map((row) => {
      const stockNumber = Number(row?.stock ?? 0);
      return { value: String(row?.value ?? "").trim(), label: typeof row?.label === "string" ? row.label.trim() : undefined, stock: Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0, isSoldOut: row?.isSoldOut === true };
    }).filter((row) => row.value.length > 0);
  }
  if (Array.isArray(product.gaugeOptions) && product.gaugeOptions.length > 0) {
    const fallbackStock = Number(product.inventory?.stock ?? 0);
    const normalizedFallbackStock = Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return product.gaugeOptions.map((value) => String(value ?? "").trim()).filter(Boolean).map((value) => ({ value, stock: normalizedFallbackStock, isSoldOut: false }));
  }
  return [];
}

function normalizeColorRows(product: SelectableStringProduct): ColorInventoryRow[] {
  if (Array.isArray(product?.colorInventories) && product.colorInventories.length > 0) {
    return product.colorInventories.map((row) => {
      const stockNumber = Number(row?.stock ?? 0);
      return { value: String(row?.value ?? "").trim(), label: typeof row?.label === "string" ? row.label.trim() : undefined, colorHex: typeof row?.colorHex === "string" ? row.colorHex.trim() : undefined, image: typeof row?.image === "string" ? row.image.trim() : undefined, stock: Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0, isSoldOut: row?.isSoldOut === true };
    }).filter((row) => row.value.length > 0);
  }
  if (Array.isArray(product?.colorOptions) && product.colorOptions.length > 0) {
    const fallbackStock = Number(product?.inventory?.stock ?? 0);
    const normalizedFallbackStock = Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return product.colorOptions.map((value: unknown) => String(value ?? "").trim()).filter(Boolean).map((value: string) => ({ value, label: value, stock: normalizedFallbackStock, isSoldOut: false }));
  }
  if (typeof product?.color === "string" && product.color.trim()) {
    const fallbackStock = Number(product?.inventory?.stock ?? 0);
    const normalizedFallbackStock = Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return [{ value: product.color.trim(), label: product.color.trim(), stock: normalizedFallbackStock, isSoldOut: false }];
  }
  return [];
}

const getGaugeLabel = (row: GaugeInventoryRow) => String(row.label ?? "").trim() || formatGaugeLabel(row.value);
const getColorLabel = (row: ColorInventoryRow) => String(row.label || row.value || "").trim();
const isColorSoldOut = (row: ColorInventoryRow) => row.isSoldOut === true || Number(row.stock ?? 0) <= 0;

export default function SelectStringClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [selectedGaugeByProductId, setSelectedGaugeByProductId] = useState<Record<string, string>>({});
  const [selectedColorByProductId, setSelectedColorByProductId] = useState<Record<string, string>>({});
  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore, error } = useInfiniteProducts({ limit: 6, purpose: "stringing" });
  const mountableProducts = products.filter((product) => typeof (product as SelectableStringProduct).mountingFee === "number" && Number.isFinite((product as SelectableStringProduct).mountingFee) && Number((product as SelectableStringProduct).mountingFee) >= 0);

  useEffect(() => {
    setSelectedColorByProductId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const product of mountableProducts as SelectableStringProduct[]) {
        if (next[product._id]) continue;
        const rows = normalizeColorRows(product);
        if (!rows.length) continue;
        const firstAvailable = rows.find((row) => !isColorSoldOut(row)) ?? rows[0];
        if (firstAvailable?.value) {
          next[product._id] = firstAvailable.value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [mountableProducts]);

  const handleSelectString = async (product: SelectableStringProduct, selectedGauge?: string, selectedColor?: string) => {
    if (addingProductId) return;
    setAddingProductId(product._id);
    const gaugeRows = normalizeGaugeRows(product);
    const colorRows = normalizeColorRows(product);
    const requiresGaugeSelection = gaugeRows.length > 0;
    const requiresColorSelection = colorRows.length > 0;
    const normalizedGauge = typeof selectedGauge === "string" ? selectedGauge.trim() : "";
    const normalizedColor = typeof selectedColor === "string" ? selectedColor.trim() : "";
    if (requiresGaugeSelection && !normalizedGauge) { showErrorToast("게이지를 선택해주세요."); setAddingProductId(null); return; }
    if (requiresColorSelection && !normalizedColor) { showErrorToast("색상을 선택해주세요."); setAddingProductId(null); return; }
    if (requiresGaugeSelection && normalizedGauge) {
      const selectedGaugeRow = gaugeRows.find((row) => row.value === normalizedGauge);
      if (!selectedGaugeRow) { showErrorToast("선택한 게이지를 찾을 수 없습니다."); setAddingProductId(null); return; }
      if (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock < REQUIRED_QUANTITY) { showErrorToast("선택한 게이지의 재고가 부족합니다."); setAddingProductId(null); return; }
    }
    if (requiresColorSelection && normalizedColor) {
      const selectedColorRow = colorRows.find((row) => row.value === normalizedColor);
      if (!selectedColorRow) { showErrorToast("선택한 색상 정보를 찾을 수 없습니다."); setAddingProductId(null); return; }
      if (isColorSoldOut(selectedColorRow)) { showErrorToast("선택한 색상은 현재 품절입니다."); setAddingProductId(null); return; }
      if (selectedColorRow.stock < REQUIRED_QUANTITY) { showErrorToast("선택한 색상의 구매 가능 수량을 초과했습니다."); setAddingProductId(null); return; }
    }
    try {
      const params = new URLSearchParams(); params.set("orderId", orderId); params.set("productId", product._id);
      if (normalizedGauge) params.set("selectedGauge", normalizedGauge);
      if (normalizedColor) params.set("selectedColor", normalizedColor);
      router.push(`/services/apply?${params.toString()}`);
    } finally { setAddingProductId(null); }
  };

  if (isLoadingInitial) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="rounded-lg border border-border bg-card p-3 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-full" /></div>)}</div>;
  if (error) return <div className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">목록을 불러오는 중 오류가 발생했습니다. {error}</div>;
  if (!mountableProducts || mountableProducts.length === 0) return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">사용 가능한 스트링이 없습니다.</p><p className="mt-1">장착 가능한 스트링 상품 설정을 확인하거나, 교체서비스 신청 화면으로 돌아가 다시 진행해주세요.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button type="button" variant="default" onClick={() => router.push(`/services/apply?orderId=${orderId}`)}>교체서비스 신청 화면으로</Button><Button type="button" variant="outline" onClick={() => router.push("/products?from=apply")}>스트링 목록으로</Button></div></div>;

  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mountableProducts.map((p: SelectableStringProduct) => { const isAdding = addingProductId === p._id; const gaugeRows = normalizeGaugeRows(p); const colorRows = normalizeColorRows(p); const hasGaugeOptions = gaugeRows.length > 0; const selectedGauge = selectedGaugeByProductId[p._id] ?? ""; const selectedColor = selectedColorByProductId[p._id] ?? ""; const selectedGaugeRow = gaugeRows.find((row) => row.value === selectedGauge); const selectedColorRow = colorRows.find((row) => row.value === selectedColor); const isSelectedGaugeBlocked = !!selectedGaugeRow && (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock < REQUIRED_QUANTITY); const isSelectedColorBlocked = !!selectedColorRow && (isColorSoldOut(selectedColorRow) || selectedColorRow.stock < REQUIRED_QUANTITY); const disableSelectButton = !!addingProductId || (hasGaugeOptions && (!selectedGauge || !selectedGaugeRow || isSelectedGaugeBlocked)) || (colorRows.length > 0 && (!selectedColor || !selectedColorRow || isSelectedColorBlocked));
    return <div key={p._id} data-cy="racket-string-option" className="flex h-full flex-col rounded-lg border border-border bg-card p-3 text-left text-foreground transition hover:border-primary"><div className="font-medium">{p.name}</div><div className="text-sm text-muted-foreground">{typeof p.price === "number" ? `${p.price.toLocaleString()}원` : "가격 정보 없음"}</div>{typeof p.mountingFee === "number" && <div className="mt-1 text-xs text-muted-foreground">장착비: {p.mountingFee.toLocaleString()}원</div>}<p className="mt-2 text-xs leading-relaxed text-muted-foreground">선택한 스트링은 기존 라켓 주문과 연결되어 교체서비스 신청에 사용됩니다.</p>{hasGaugeOptions && <div className="mt-3 space-y-1"><div className="text-xs font-medium text-foreground">게이지 선택</div><Select value={selectedGauge} onValueChange={(value) => setSelectedGaugeByProductId((prev) => ({ ...prev, [p._id]: value }))}><SelectTrigger className="h-9 w-full text-xs"><SelectValue placeholder="게이지를 선택하세요" /></SelectTrigger><SelectContent>{gaugeRows.map((row) => { const isSoldOut = row.isSoldOut || row.stock <= 0; const suffix = isSoldOut ? " · 품절" : p.inventory?.hideGaugeStock === true ? "" : ` · 재고 ${row.stock}개`; return <SelectItem key={`${p._id}-${row.value}`} value={row.value} disabled={isSoldOut} className="text-xs">{`${getGaugeLabel(row)}${suffix}`}</SelectItem>; })}</SelectContent></Select></div>}
      {colorRows.length > 0 && <div className="mt-3 space-y-2"><div className="text-xs font-medium text-foreground">색상 선택</div>{colorRows.length === 1 ? <div className="text-xs text-muted-foreground">색상: {getColorLabel(colorRows[0])}</div> : <div className="flex flex-wrap gap-2">{colorRows.map((row) => { const isSoldOut = isColorSoldOut(row); const selected = selectedColor === row.value; return <button key={`${p._id}-color-${row.value}`} type="button" disabled={isSoldOut} onClick={() => setSelectedColorByProductId((prev) => ({ ...prev, [p._id]: row.value }))} className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"} ${isSoldOut ? "opacity-50 cursor-not-allowed" : "hover:border-primary/60"}`}>{row.image ? <img src={row.image} alt={getColorLabel(row)} className="h-5 w-5 rounded object-cover" /> : row.colorHex ? <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: row.colorHex }} /> : null}<span>{getColorLabel(row)}</span>{isSoldOut ? <span className="text-destructive">품절</span> : null}</button>; })}</div>}</div>}
      <Button type="button" data-cy="racket-string-select-button" disabled={disableSelectButton} className="mt-auto min-h-10 w-full h-auto whitespace-normal break-keep text-center leading-tight" onClick={() => handleSelectString(p, selectedGauge, selectedColor)}>{isAdding ? "이동 중…" : "이 스트링 선택하고 신청 계속하기"}</Button></div>; })}</div>{hasMore && <div className="pt-2"><Button type="button" variant="outline" data-cy="racket-string-load-more" onClick={loadMore} disabled={isFetchingMore || !!addingProductId} className="w-full border-border bg-card text-foreground">{isFetchingMore ? <Skeleton className="mx-auto h-4 w-20" /> : "더 보기"}</Button></div>}</div>;
}
