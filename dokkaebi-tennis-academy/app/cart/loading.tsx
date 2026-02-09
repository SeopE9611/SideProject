import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="장바구니 불러오는 중..." minHeightClassName="min-h-[70svh]" />;
}
