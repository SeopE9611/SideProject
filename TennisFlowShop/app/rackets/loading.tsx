import { CommerceCatalogPageSkeleton } from "@/components/commerce";

export default function RacketsLoading() {
  return (
    <CommerceCatalogPageSkeleton
      loadingLabel="라켓 목록과 탐색 도구를 불러오는 중입니다."
      actionCount={2}
      showDetailBlock
    />
  );
}
