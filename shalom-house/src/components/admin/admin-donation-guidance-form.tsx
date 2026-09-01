"use client";

import { useState, type FormEvent } from "react";
import type { DonationGuidanceContent } from "@/features/site-content/site-content.types";

type AdminDonationGuidanceFormProps = {
  initialContent: DonationGuidanceContent;
  expectedUpdatedAt: string | null;
};
type TextKey = Exclude<keyof DonationGuidanceContent, "steps">;
type ResponseBody = { error?: string; fieldErrors?: Record<string, string>; redirectTo?: string };
const fields: { key: TextKey; label: string; multiline?: boolean }[] = [
  { key: "pageDescription", label: "후원 페이지 설명", multiline: true },
  { key: "notice", label: "중요 안내", multiline: true },
  { key: "contactTitle", label: "문의 영역 제목" },
  { key: "contactDescription", label: "문의 영역 설명", multiline: true },
  { key: "transparencyLinkLabel", label: "자료공개 링크 문구" },
  { key: "donationInquiryLabel", label: "후원 문의 링크 문구" },
  { key: "receiptInquiryLabel", label: "후원금 영수증·내역 문의 링크 문구" },
];

export function AdminDonationGuidanceForm({
  initialContent,
  expectedUpdatedAt,
}: AdminDonationGuidanceFormProps) {
  const [content, setContent] = useState(initialContent);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  function updateText(key: TextKey, value: string) {
    setContent((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
  }
  function updateStep(index: number, value: string) {
    setContent((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? value : step)) as unknown as DonationGuidanceContent["steps"],
    }));
    setConfirmed(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      const response = await fetch("/api/admin/site-content/donation-guidance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt, saveConfirmed: confirmed, content }),
      });
      let data: ResponseBody;
      try {
        data = await response.json();
      } catch {
        setMessage("후원 안내를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (!response.ok) {
        setErrors(data.fieldErrors ?? {});
        setMessage(
          data.error === "edit_conflict"
            ? "다른 관리자가 후원 안내를 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요."
            : data.error === "validation"
              ? "입력 내용을 확인해 주세요."
              : "후원 안내를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      if (
        typeof data.redirectTo !== "string" ||
        !data.redirectTo.startsWith("/admin/site-content/donation-guidance")
      ) {
        setMessage("후원 안내를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      window.location.assign(data.redirectTo);
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={busy} className="space-y-6">
      <p className="rounded-card border bg-surface-subtle p-4">
        공식 확인이 끝나지 않은 계좌번호, 예금주나 결제 정보는 입력하지 마세요.
      </p>
      {fields.slice(0, 2).map(({ key, label, multiline }) => (
        <TextField key={key} {...{ keyName: key, label, multiline, value: content[key], errors, updateText }} />
      ))}
      <fieldset className="space-y-4">
        <legend className="text-heading font-bold">후원 절차</legend>
        {content.steps.map((step, index) => {
          const id = `donation-steps-${index}`;
          const error = errors[`steps.${index}`] ?? (index === 0 ? errors.steps : undefined);
          return (
            <div key={id}>
              <label className="block font-semibold" htmlFor={id}>후원 절차 {index + 1}</label>
              <input
                id={id}
                value={step}
                onChange={(event) => updateStep(index, event.target.value)}
                aria-describedby={error ? `${id}-error` : undefined}
                aria-invalid={error ? true : undefined}
                className="mt-2 min-h-11 w-full rounded-control border px-3 py-2"
              />
              {error ? <p id={`${id}-error`} role="alert" className="text-small text-danger">{error}</p> : null}
            </div>
          );
        })}
      </fieldset>
      {fields.slice(2).map(({ key, label, multiline }) => (
        <TextField key={key} {...{ keyName: key, label, multiline, value: content[key], errors, updateText }} />
      ))}
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          aria-describedby={errors.saveConfirmed ? "donation-confirm-error" : undefined}
          aria-invalid={errors.saveConfirmed ? true : undefined}
        />
        <span>입력한 후원 안내가 공개 홈페이지에 즉시 반영되는 것을 확인했습니다.</span>
      </label>
      {errors.saveConfirmed ? (
        <p id="donation-confirm-error" role="alert" className="text-small text-danger">{errors.saveConfirmed}</p>
      ) : null}
      {message ? <p role="alert" className="font-semibold text-danger">{message}</p> : null}
      <button
        type="submit"
        disabled={!confirmed || busy}
        className="min-h-11 rounded-control bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "저장 중…" : "후원 안내 저장"}
      </button>
    </form>
  );
}

function TextField({ keyName, label, multiline, value, errors, updateText }: {
  keyName: TextKey;
  label: string;
  multiline?: boolean;
  value: string;
  errors: Record<string, string>;
  updateText: (key: TextKey, value: string) => void;
}) {
  const id = `donation-${keyName}`;
  const error = errors[keyName];
  const common = {
    id,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateText(keyName, event.target.value),
    "aria-describedby": error ? `${id}-error` : undefined,
    "aria-invalid": error ? (true as const) : undefined,
    className: "mt-2 min-h-11 w-full rounded-control border px-3 py-2",
  };
  return (
    <div>
      <label className="block font-semibold" htmlFor={id}>{label}</label>
      {multiline ? <textarea {...common} className={`${common.className} min-h-24`} /> : <input {...common} />}
      {error ? <p id={`${id}-error`} role="alert" className="text-small text-danger">{error}</p> : null}
    </div>
  );
}
