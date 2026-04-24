import { FullPageSpinner } from "@/components/system/loading";

export default function OrderLookupLoading() {
  return (
    <FullPageSpinner
      label="주문 조회 화면을 준비하고 있습니다..."
      minHeightClassName="min-h-[50svh]"
    />
  );
}
