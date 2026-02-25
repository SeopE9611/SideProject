import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="배송 상태를 불러오는 중..." minHeightClassName="min-h-[70svh]" />;
}
