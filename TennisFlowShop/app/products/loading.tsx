import { FullPageSpinner } from "@/components/system/loading";

export default function Loading() {
  return (
    <FullPageSpinner
      label="상품 목록을 준비하고 있습니다..."
      minHeightClassName="min-h-[50svh]"
    />
  );
}
