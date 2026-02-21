import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="결제 결과 확인 중..." className="bg-background from-slate-50 via-muted to-card dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />;
}
