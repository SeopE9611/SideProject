import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

type UseProductDetailRelatedProductsParams = {
  productId: string;
  brand?: string;
  material?: string;
  fetcher: (url: string) => Promise<any>;
};

export function useProductDetailRelatedProducts({
  productId,
  brand,
  material,
  fetcher,
}: UseProductDetailRelatedProductsParams) {
  const relatedSectionRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadRelated, setShouldLoadRelated] = useState(false);

  useEffect(() => {
    const el = relatedSectionRef.current;
    if (!el || shouldLoadRelated) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoadRelated(true);
        io.disconnect();
      },
      {
        rootMargin: "600px 0px",
      },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoadRelated]);

  // 1) 브랜드 기준 1차
  const { data: byBrand } = useSWR(
    shouldLoadRelated
      ? `/api/products?brand=${encodeURIComponent(brand ?? "")}&limit=16&exclude=${productId}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // 2) 재질 기준 2차 (1차가 빈 경우에만)
  const { data: byMaterial } = useSWR(
    shouldLoadRelated && !byBrand?.products?.length && material
      ? `/api/products?material=${encodeURIComponent(material)}&limit=16&exclude=${productId}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  // 3) 전체 백업 3차 (1·2차 둘 다 빈 경우에만)
  const { data: anyPool } = useSWR(
    shouldLoadRelated && !byBrand?.products?.length && !byMaterial?.products?.length
      ? `/api/products?limit=16&exclude=${productId}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // 최종 풀 구성
  const pool =
    (byBrand?.products?.length
      ? byBrand.products
      : byMaterial?.products?.length
        ? byMaterial.products
        : anyPool?.products) ?? [];

  const relatedFiltered = useMemo(() => {
    const base = pool.filter((p: any) => String(p._id) !== String(productId));
    const same = base.filter((p: any) => p.brand === brand || p.material === material);
    return (same.length ? same : base).slice(0, 4);
  }, [pool, productId, brand, material]);

  // 로딩 상태(세 요청 모두 아직 없음)
  const loadingRelated = !shouldLoadRelated || (!byBrand && !byMaterial && !anyPool);

  return {
    relatedSectionRef,
    relatedFiltered,
    loadingRelated,
  };
}
