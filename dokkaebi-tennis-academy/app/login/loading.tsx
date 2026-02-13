import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="로그인 화면을 불러오는 중..." minHeightClassName="min-h-[60svh]" />;
}
