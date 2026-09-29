import { useState, useEffect, useRef, useCallback } from "react";

type ProductGaugeInventory = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
};

type ProductColorInventory = {
  value: string;
  label?: string;
  colorHex?: string;
  image?: string;
  stock: number;
  isSoldOut: boolean;
};

type ProductVariantInventory = {
  colorValue: string;
  colorLabel?: string;
  colorHex?: string;
  colorImage?: string;
  gaugeValue: string;
  gaugeLabel?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};

type Product = {
  _id: string;
  name: string;
  brand: string;
  price: number;
  images?: string[];
  features?: Record<string, number>;
  isNew?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  ratingAverage?: number;
  gaugeOptions?: string[];
  gaugeInventories?: ProductGaugeInventory[];
  color?: string;
  colorOptions?: string[];
  colorInventories?: ProductColorInventory[];
  variantInventories?: ProductVariantInventory[];
  inventory?: {
    stock?: number;
    status?: "instock" | "outofstock" | "backorder" | string;
    manageStock?: boolean;
    allowBackorder?: boolean;
    hideGaugeStock?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
    isSale?: boolean;
  };
};

type Filters = {
  brand?: string | null;
  material?: string | null;
  power?: number | null;
  control?: number | null;
  spin?: number | null;
  durability?: number | null;
  comfort?: number | null;
  q?: string;
  sort?: string;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  /**
   * 추가 목적 필터
   * - purpose=stringing : 교체 서비스용 "스트링" 상품만 노출
   */
  purpose?: string;
  exposure?: string;
  includeSoldOut?: boolean;
};

type ResponseShape = {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

function buildQueryString(filters: Filters, page: number) {
  const params = new URLSearchParams();
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.material) params.set("material", filters.material);
  if (filters.power !== null && filters.power !== undefined)
    params.set("power", String(filters.power));
  if (filters.control !== null && filters.control !== undefined)
    params.set("control", String(filters.control));
  if (filters.spin !== null && filters.spin !== undefined) params.set("spin", String(filters.spin));
  if (filters.durability !== null && filters.durability !== undefined)
    params.set("durability", String(filters.durability));
  if (filters.comfort !== null && filters.comfort !== undefined)
    params.set("comfort", String(filters.comfort));
  if (filters.q) params.set("q", filters.q);
  if (filters.sort && filters.sort !== "latest") params.set("sort", filters.sort);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.exposure && filters.exposure !== "all") params.set("exposure", filters.exposure);
  if (filters.includeSoldOut === true) params.set("includeSoldOut", "true");
  params.set("page", String(page));
  return params.toString();
}

export function useInfiniteProducts(filters: Filters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null); // 전체 매칭 개수(필터 기준)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이전 filters 문자열로 비교해서 필터가 바뀌면 1페이지를 교체 요청한다.
  const lastSerialized = useRef("");
  const requestSeq = useRef(0);
  const serializedFilters = buildQueryString(filters, 1); // page=1 for comparison

  // 실제 데이터를 가져오는 함수
  const fetchPage = useCallback(
    async (targetPage: number, replace = false) => {
      const requestId = targetPage === 1 || replace ? ++requestSeq.current : requestSeq.current;
      try {
        if (targetPage === 1) setIsLoadingInitial(true);
        else setIsFetchingMore(true);
        setError(null);

        const qs = buildQueryString(filters, targetPage);
        const res = await fetch(`/api/products?${qs}`);
        if (!res.ok) {
          throw new Error(`서버 오류: ${res.status}`);
        }
        const data: ResponseShape = await res.json();
        if (requestId !== requestSeq.current) return;

        // 누적 또는 교체
        setProducts((prev) =>
          targetPage === 1 || replace ? data.products : [...prev, ...data.products],
        );
        setHasMore(data.pagination.hasMore);
        setPage(data.pagination.page);
        setTotal(data.pagination.total); // 서버 total 반영
      } catch (err: any) {
        if (requestId !== requestSeq.current) return;
        console.error("상품 로드 실패", err);
        setError(err.message || "알 수 없는 오류");
      } finally {
        if (requestId === requestSeq.current) {
          setIsLoadingInitial(false);
          setIsFetchingMore(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    if (serializedFilters !== lastSerialized.current) {
      // 필터 변경 중에는 기존 목록/total을 유지하고, 응답 완료 후 새 1페이지로 교체한다.
      lastSerialized.current = serializedFilters;
      setPage(1);
      setHasMore(true);
      setError(null);
      fetchPage(1, true);
    }
  }, [serializedFilters]);

  // 다음 페이지 요청 헬퍼
  const loadMore = useCallback(() => {
    if (isFetchingMore || isLoadingInitial || !hasMore) return;
    fetchPage(page + 1);
  }, [fetchPage, hasMore, isFetchingMore, isLoadingInitial, page]);

  return {
    products,
    total,
    isLoadingInitial,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
    reset: () => {
      setProducts([]);
      setPage(1);
      setHasMore(true);
      setTotal(null);
      setError(null);
      fetchPage(1, true);
    },
  };
}
