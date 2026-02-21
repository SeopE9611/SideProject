import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="결제 결과 확인 중..." className="bg-background from-background via-muted to-card dark:from-background dark:via-muted dark:to-card" />;
}
