import { IS_PORTFOLIO_DEMO_CLIENT } from "@/lib/storage-config";
import { showErrorToast } from "@/lib/toast";

export function blockPortfolioDemoStorageUpload() {
  if (!IS_PORTFOLIO_DEMO_CLIENT) return false;
  showErrorToast("데모 환경에서는 파일 업로드가 비활성화되어 있습니다.");
  return true;
}
