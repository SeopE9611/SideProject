import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="스트링 선택 정보를 불러오는 중..." minHeightClassName="min-h-[70svh]" />;
}
