"use client";

import { useEffect, useState } from "react";

import { subscribeToToasts, type ToastMessage } from "@/lib/toast";

const toastLabels = {
  success: "완료",
  error: "오류",
  info: "안내",
} as const;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(
    () =>
      subscribeToToasts((toast) => {
        setToasts((current) => [...current, toast]);
        window.setTimeout(
          () => setToasts((current) => current.filter((item) => item.id !== toast.id)),
          toast.tone === "error" ? 6000 : 4000,
        );
      }),
    [],
  );

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  const renderToasts = (tone: ToastMessage["tone"]) =>
    toasts
      .filter((toast) => toast.tone === tone)
      .map((toast) => (
        <div key={toast.id} className="app-toast" data-tone={toast.tone}>
          <div>
            <p className="app-toast-label">{toastLabels[toast.tone]}</p>
            <p>{toast.message}</p>
          </div>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label={`${toastLabels[toast.tone]} 메시지 닫기`}>
            닫기
          </button>
        </div>
      ));

  return (
    <div className="app-toast-viewport" aria-label="알림">
      <div role="status" aria-live="polite" aria-atomic="false">
        {renderToasts("success")}
        {renderToasts("info")}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="false">
        {renderToasts("error")}
      </div>
    </div>
  );
}
