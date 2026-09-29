import { CommerceDetailSkeleton } from "@/components/commerce/detail";

export default function RacketDetailLoading() {
  return (
    <CommerceDetailSkeleton
      loadingLabel="라켓 상세 정보를 불러오는 중입니다."
      optionSectionCount={2}
      actionCount={2}
    />
  );
}
