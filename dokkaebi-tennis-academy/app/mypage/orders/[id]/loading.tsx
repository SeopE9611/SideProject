import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="주문 상세를 불러오는 중..." minHeightClassName="min-h-[70svh]" />;
}
