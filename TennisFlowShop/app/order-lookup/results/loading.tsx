import { FullPageSpinner } from "@/components/system/loading";

export default function OrderLookupResultsLoading() {
  return (
    <FullPageSpinner
      label="조회 결과를 준비하고 있습니다..."
      minHeightClassName="min-h-[50svh]"
    />
  );
}
