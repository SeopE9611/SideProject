import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="운송장 입력 화면을 불러오는 중..." minHeightClassName="min-h-[70svh]" />;
}
