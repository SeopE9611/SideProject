import { useState, useEffect, useRef, useCallback } from 'react';

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
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.material) params.set('material', filters.material);
  if (filters.power !== null && filters.power !== undefined) params.set('power', String(filters.power));
  if (filters.control !== null && filters.control !== undefined) params.set('control', String(filters.control));
  if (filters.spin !== null && filters.spin !== undefined) params.set('spin', String(filters.spin));
  if (filters.durability !== null && filters.durability !== undefined) params.set('durability', String(filters.durability));
  if (filters.comfort !== null && filters.comfort !== undefined) params.set('comfort', String(filters.comfort));
  if (filters.q) params.set('q', filters.q);
  if (filters.sort && filters.sort !== 'latest') params.set('sort', filters.sort);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.purpose) params.set('purpose', filters.purpose);
  params.set('page', String(page));
  return params.toString();
}

export function useInfiniteProducts(filters: Filters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null); // 전체 매칭 개수(필터 기준)
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이전 filters 문자열로 비교해서 필터가 바뀌면 리셋
  const lastSerialized = useRef('');
  const serializedFilters = buildQueryString(filters, 1); // page=1 for comparison

  useEffect(() => {
    if (serializedFilters !== lastSerialized.current) {
      // 필터가 바뀐 경우: 리셋 상태
      lastSerialized.current = serializedFilters;
      setProducts([]);
      setPage(1);
      setHasMore(true);
      setTotal(null); // 필터 변경 시 total도 초기화(이전 값 잠깐 보이는 현상 방지)
      setError(null);
      // initial load
      fetchPage(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedFilters]);

  // 실제 데이터를 가져오는 함수
  const fetchPage = useCallback(
    async (targetPage: number, replace = false) => {
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

        // 누적 또는 교체
        setProducts((prev) => (targetPage === 1 || replace ? data.products : [...prev, ...data.products]));
        setHasMore(data.pagination.hasMore);
        setPage(data.pagination.page);
        setTotal(data.pagination.total); // 서버 total 반영
      } catch (err: any) {
        console.error('상품 로드 실패', err);
        setError(err.message || '알 수 없는 오류');
      } finally {
        setIsLoadingInitial(false);
        setIsFetchingMore(false);
      }
    },
    [filters],
  );

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
