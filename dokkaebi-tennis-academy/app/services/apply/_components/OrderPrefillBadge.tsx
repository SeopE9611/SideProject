'use client';

type Props = {
  orderId: string | null;
  rentalId?: string | null;
};

/**
 * 주문 기반 진입(/services/apply?orderId=...)일 때
 * "주문 프리필" 상태를 사용자에게 알려주는 배지 UI
 */
export default function OrderPrefillBadge({ orderId }: Props) {
  const id = orderId ?? null;
  const typeLabel = '주문';
  // rentalId가 들어오면 주문 대신 대여로 표시
  // (orderId가 있으면 orderId 우선)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rentalId = (arguments[0] as any)?.rentalId ?? null;
  const finalId = id ?? rentalId;
  const finalLabel = id ? '주문' : rentalId ? '대여' : '';
  if (!finalId) return null;

  return (
    <div className="mb-6">
      <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
          <span className="font-semibold text-blue-900 dark:text-blue-100">프리필</span>
        </div>
        <span className="h-4 w-px bg-blue-200 dark:bg-blue-700" />
        <span className="text-sm text-slate-600 dark:text-slate-300">{finalLabel}</span>
        <code className="rounded bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-mono text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">{finalId}</code>
        <span className="text-sm text-slate-600 dark:text-slate-300">기준으로 자동 채워짐</span>
      </div>
    </div>
  );
}
