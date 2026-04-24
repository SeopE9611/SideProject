import { FullPageSpinner } from "@/components/system/loading";

export default function ApplicationDetailLoading() {
  return (
    <FullPageSpinner
      label="신청서 상세를 준비하고 있습니다..."
      minHeightClassName="min-h-[50svh]"
    />
  );
}
