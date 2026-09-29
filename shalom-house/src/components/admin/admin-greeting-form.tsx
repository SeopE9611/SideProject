"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { GreetingContent } from "@/features/site-content/site-content.types";
export function AdminGreetingForm({
  content: initial,
  updatedAt,
}: {
  content: GreetingContent;
  updatedAt: string | null;
}) {
  const confirmationErrorId = "greeting-save-error";
  const signerDisclosureDescriptionId = "greeting-signer-disclosure-description";
  const [content, setContent] = useState(() => structuredClone(initial));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const update = (key: keyof GreetingContent, value: string | boolean) => setContent((c) => ({ ...c, [key]: value }));
  const field = (
    label: string,
    key: "pageDescription" | "notice" | "statusLabel" | "title" | "signerRole" | "signerName",
    area = false,
  ) => {
    const id = `greeting-${key}`;
    const E = area ? "textarea" : "input";
    return (
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="block font-semibold" htmlFor={id}>
          {label}
        </label>
        <E
          id={id}
          value={content[key]}
          onChange={(e) => update(key, e.target.value)}
          rows={area ? 4 : undefined}
          aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? `${id}-error` : undefined}
          className="w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        />
        {errors[key] ? (
          <p id={`${id}-error`} className="text-small font-semibold text-danger">
            {errors[key]}
          </p>
        ) : null}
      </div>
    );
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      const res = await fetch("/api/admin/site-content/greeting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUpdatedAt: updatedAt,
          saveConfirmed: confirmed,
          content,
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!body || typeof body !== "object") {
        setMessage("공식 콘텐츠를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const data = body as {
        error?: string;
        fieldErrors?: Record<string, string>;
        redirectTo?: string;
      };
      if (!res.ok) {
        setErrors(data.fieldErrors ?? {});
        setMessage(
          data.error === "edit_conflict"
            ? "다른 관리자가 이 콘텐츠를 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요."
            : data.error === "validation"
              ? "입력 내용을 확인해 주세요."
              : "공식 콘텐츠를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      if (data.redirectTo) window.location.assign(data.redirectTo);
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy} className="max-w-4xl space-y-6">
      {field("페이지 설명", "pageDescription", true)}
      {field("공개 안내", "notice", true)}
      {field("상태 문구", "statusLabel")}
      {field("제목", "title")}
      <fieldset className="space-y-4">
        <legend className="text-heading font-bold">본문 문단</legend>
        {content.paragraphs.map((p, i) => {
          const paragraphId = `greeting-paragraph-${i}`;
          const paragraphErrorId = `${paragraphId}-error`;
          const paragraphError = errors[`paragraphs.${i}`];
          return (
            <div key={i} className="grid gap-2 border-b border-border pb-6">
              <label className="block font-semibold" htmlFor={paragraphId}>
                문단 {i + 1}
              </label>
              <textarea
                id={paragraphId}
                value={p}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    paragraphs: c.paragraphs.map((x, j) => (j === i ? e.target.value : x)),
                  }))
                }
                aria-describedby={paragraphError ? paragraphErrorId : undefined}
                aria-invalid={paragraphError ? true : undefined}
                className="min-h-28 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              />
              {paragraphError ? (
                <p id={paragraphErrorId} role="alert" className="text-small font-semibold text-danger">
                  {paragraphError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={content.paragraphs.length <= 1}
                onClick={() =>
                  setContent((c) => ({
                    ...c,
                    paragraphs: c.paragraphs.filter((_, j) => j !== i),
                  }))
                }
                className="min-h-11 justify-self-start underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                문단 삭제
              </button>
            </div>
          );
        })}
        <button
          type="button"
          disabled={content.paragraphs.length >= 8}
          onClick={() => setContent((c) => ({ ...c, paragraphs: [...c.paragraphs, ""] }))}
          className="min-h-11 rounded-control border border-border-strong px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          문단 추가
        </button>
        {errors.paragraphs ? (
          <p role="alert" className="text-small font-semibold text-danger">
            {errors.paragraphs}
          </p>
        ) : null}
      </fieldset>
      {field("서명 직책", "signerRole")}
      {field("서명 이름", "signerName")}
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={content.showSignerName}
            onChange={(e) => update("showSignerName", e.target.checked)}
            aria-describedby={signerDisclosureDescriptionId}
            className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <span>원장 이름 공개</span>
        </label>
        <p id={signerDisclosureDescriptionId} className="text-small text-muted-foreground">
          체크한 경우에만 입력한 원장 이름이 공개 페이지에 표시됩니다.
        </p>
      </div>
      <div className="border-l-4 border-warning bg-warning-soft p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} aria-describedby={errors.saveConfirmed ? confirmationErrorId : undefined} aria-invalid={errors.saveConfirmed ? true : undefined} className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
          <span>입력한 내용이 공개 홈페이지에 즉시 반영되는 것을 확인했습니다.</span>
        </label>
        {errors.saveConfirmed ? <p id={confirmationErrorId} role="alert" className="mt-3 text-small font-semibold text-danger">{errors.saveConfirmed}</p> : null}
      </div>
      {message ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button type="submit" disabled={busy} className="min-h-12 rounded-control bg-primary px-6 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60">{busy ? "저장 중…" : "공식 콘텐츠 저장"}</button>
        <Link href="/admin/site-content" className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">취소</Link>
      </div>
    </form>
  );
}
