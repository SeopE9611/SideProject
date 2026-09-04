"use client";

import { useEffect, useRef, useState } from "react";

type ValidationNotice = {
  count: number;
  firstFieldId: string | null;
  firstFieldLabel: string;
};

function getFieldLabel(control: HTMLElement): string {
  const id = control.id;
  if (id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    const text = label?.textContent?.replace(/\s+/g, " ").trim();
    if (text) return text;
  }

  return control.getAttribute("aria-label")?.trim() || "입력 항목";
}

function getInvalidControls(form: HTMLFormElement): HTMLElement[] {
  const controls = Array.from(
    form.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, [contenteditable="true"]'),
  );

  return controls.filter((control) => {
    if (control.getAttribute("aria-invalid") === "true") return true;
    return control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
      ? !control.validity.valid
      : false;
  });
}

export function AdminFormFeedback() {
  const [notice, setNotice] = useState<ValidationNotice | null>(null);
  const lastSignature = useRef("");
  const activeForm = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".admin-main");
    if (!root) return;

    let scheduledFrame = 0;

    const reportInvalidForm = (form: HTMLFormElement, moveFocus: boolean) => {
      const invalidControls = getInvalidControls(form);
      if (invalidControls.length === 0) return;

      const first = invalidControls[0];
      const signature = `${form.getAttribute("action") ?? "client"}:${first.id}:${invalidControls.length}`;
      form.dataset.validationAttempted = "true";
      setNotice({
        count: invalidControls.length,
        firstFieldId: first.id || null,
        firstFieldLabel: getFieldLabel(first),
      });

      if (moveFocus && signature !== lastSignature.current) {
        lastSignature.current = signature;
        first.focus({ preventScroll: true });
        first.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    const scheduleCustomValidationCheck = () => {
      window.cancelAnimationFrame(scheduledFrame);
      scheduledFrame = window.requestAnimationFrame(() => {
        if (activeForm.current) reportInvalidForm(activeForm.current, true);
      });
    };

    const handleInvalid = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const form = target.closest("form");
      if (!(form instanceof HTMLFormElement)) return;
      activeForm.current = form;
      window.requestAnimationFrame(() => reportInvalidForm(form, true));
    };

    const handleSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      activeForm.current = form;
      form.dataset.validationAttempted = "true";
      lastSignature.current = "";
      setNotice(null);
      window.requestAnimationFrame(() => reportInvalidForm(form, false));
    };

    const observer = new MutationObserver(scheduleCustomValidationCheck);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-invalid"],
    });
    root.addEventListener("invalid", handleInvalid, true);
    root.addEventListener("submit", handleSubmit, true);

    return () => {
      window.cancelAnimationFrame(scheduledFrame);
      observer.disconnect();
      root.removeEventListener("invalid", handleInvalid, true);
      root.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  function focusFirstInvalidField() {
    if (!notice?.firstFieldId) return;
    const control = document.getElementById(notice.firstFieldId);
    control?.focus({ preventScroll: true });
    control?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (!notice) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 border border-danger/35 bg-danger-soft px-5 py-4 text-danger shadow-elevated sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-small font-semibold">
        확인할 입력 항목이 {notice.count}개 있습니다. 첫 항목은 ‘{notice.firstFieldLabel}’입니다.
      </p>
      <div className="flex shrink-0 gap-2">
        {notice.firstFieldId ? (
          <button
            type="button"
            onClick={focusFirstInvalidField}
            className="min-h-10 border border-danger/40 bg-surface px-3 text-sm font-bold text-danger"
          >
            첫 오류로 이동
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="min-h-10 px-3 text-sm font-bold underline underline-offset-4"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
