import { CommerceCatalogPageSkeleton } from "@/components/commerce";

export default function Loading() {
  return (
    <CommerceCatalogPageSkeleton
      loadingLabel="스트링 상품 목록과 탐색 도구를 불러오는 중입니다."
      actionCount={1}
      showDetailBlock
    />
  );
}
