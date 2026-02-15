import { getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

interface AdminActionOptions<T> {
  action: () => Promise<T>;
  successMessage?: string;
  fallbackErrorMessage: string;
}

export async function runAdminActionWithToast<T>({
  action,
  successMessage,
  fallbackErrorMessage,
}: AdminActionOptions<T>): Promise<T | null> {
  try {
    const result = await action();
    if (successMessage) showSuccessToast(successMessage);
    return result;
  } catch (error) {
    const message = getAdminErrorMessage(error);
    showErrorToast(message || fallbackErrorMessage);
    return null;
  }
}
