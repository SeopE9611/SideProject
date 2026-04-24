import { FullPageSpinner } from "@/components/system/loading";

export default function Loading() {
  return (
    <FullPageSpinner
      label="배송 정보 수정 화면을 준비하고 있습니다..."
      minHeightClassName="min-h-[50svh]"
    />
  );
}
