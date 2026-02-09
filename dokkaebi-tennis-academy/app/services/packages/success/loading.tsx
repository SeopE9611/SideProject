import { FullPageSpinner } from '@/components/system/PageLoading';

export default function Loading() {
  return <FullPageSpinner label="결제 결과 확인 중..." className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />;
}
