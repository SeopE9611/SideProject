import { BOARD_STATUS_GUIDE } from '@/lib/fetchers/boardFetcher';

type Props = {
  message?: string;
  status?: number;
  fallbackMessage?: string;
};

export default function ErrorBox({ message, status, fallbackMessage = '데이터를 불러오는 중 오류가 발생했습니다.' }: Props) {
  const guide = status ? BOARD_STATUS_GUIDE[status] : undefined;
  const primary = (message && message.trim()) || guide || fallbackMessage;

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/15">
      <p>{primary}</p>
      {guide && guide !== primary && <p className="mt-1 text-xs text-destructive">안내: {guide}</p>}
    </div>
  );
}
