import { CommerceDetailSkeleton } from "@/components/commerce/detail";

export default function Loading() {
  return (
    <CommerceDetailSkeleton
      loadingLabel="스트링 상품 상세 정보를 불러오는 중입니다."
      optionSectionCount={3}
      actionCount={3}
    />
  );
}
