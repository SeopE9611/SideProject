import { showSuccessToast } from '@/lib/toast';

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  showSuccessToast('복사 완료');
}
