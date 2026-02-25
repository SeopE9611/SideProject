import { Skeleton } from '@/components/ui/skeleton';

type UsersKpiStatus = 'loading' | 'error' | 'ready';

type UsersKpiValues = {
  total: number;
  active: number;
  suspended: number;
  deleted: number;
  admins: number;
};

interface UsersKpiCardsProps {
  status: UsersKpiStatus;
  values: UsersKpiValues;
}

const KPI_ITEMS: Array<{ key: keyof UsersKpiValues; label: string; valueClassName: string }> = [
  { key: 'total', label: '전체 회원', valueClassName: 'text-foreground' },
  { key: 'active', label: '활성 회원', valueClassName: 'text-primary' },
  { key: 'suspended', label: '비활성 회원', valueClassName: 'text-primary' },
  { key: 'deleted', label: '삭제됨(탈퇴)', valueClassName: 'text-destructive' },
  { key: 'admins', label: '관리자 수', valueClassName: 'text-foreground' },
];

export function UsersKpiCards({ status, values }: UsersKpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6" aria-live="polite">
      {KPI_ITEMS.map((item) => (
        <div key={item.key} className="border-0 bg-card/80 shadow-lg backdrop-blur-sm rounded-xl p-5">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          {status === 'loading' ? (
            <Skeleton className="mt-2 h-10 w-16" role="status" aria-label={`${item.label} 로딩`} />
          ) : (
            <p className={`mt-1 text-3xl font-bold ${item.valueClassName}`}>{status === 'error' ? '-' : values[item.key].toLocaleString('ko-KR')}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export type { UsersKpiStatus, UsersKpiValues };
