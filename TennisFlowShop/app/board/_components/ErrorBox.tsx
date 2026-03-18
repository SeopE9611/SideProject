import AsyncState from "@/components/system/AsyncState";
import { BOARD_STATUS_GUIDE } from "@/lib/fetchers/boardFetcher";

type Props = {
  message?: string;
  status?: number;
  fallbackMessage?: string;
  onRetry?: () => void;
};

export default function ErrorBox({
  message,
  status,
  fallbackMessage = "데이터를 불러오는 중 오류가 발생했습니다.",
  onRetry,
}: Props) {
  const guide = status ? BOARD_STATUS_GUIDE[status] : undefined;
  const primary = (message && message.trim()) || guide || fallbackMessage;

  return (
    <div className="space-y-2">
      <AsyncState
        kind="error"
        variant="inline"
        title={primary}
        description={guide && guide !== primary ? `안내: ${guide}` : "네트워크/서버 상태를 확인한 뒤 다시 시도해 주세요."}
        onAction={onRetry}
      />
    </div>
  );
}
