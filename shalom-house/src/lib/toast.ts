export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();
const pending: ToastMessage[] = [];
let nextId = 0;

function showToast(tone: ToastTone, message: string) {
  const toast = { id: ++nextId, message, tone };

  if (listeners.size === 0) {
    pending.push(toast);
    return;
  }

  listeners.forEach((listener) => listener(toast));
}

export function subscribeToToasts(listener: ToastListener) {
  listeners.add(listener);
  pending.splice(0).forEach(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const showSuccessToast = (message: string) => showToast("success", message);
export const showErrorToast = (message: string) => showToast("error", message);
export const showInfoToast = (message: string) => showToast("info", message);
