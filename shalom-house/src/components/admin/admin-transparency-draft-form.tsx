"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type Values = {
  slug: string;
  title: string;
  category: string;
  periodLabel: string;
  summary: string;
  documentDate: string;
  privacyReviewStatus: string;
  finalDocumentStatus: string;
};
type Props = {
  mode: "create" | "edit";
  id?: string;
  initial?: Values & { updatedAt: string };
};
type TransparencyFormResponse = {
  error?: string;
  redirectTo?: string;
  fieldErrors?: Record<string, string>;
};
const fields = [
  ["slug", "슬러그"],
  ["title", "제목"],
  ["periodLabel", "기준 기간"],
  ["documentDate", "문서일"],
] as const;
export function AdminTransparencyDraftForm({ mode, id, initial }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const form = new FormData(event.currentTarget);
      let response: Response;
      if (mode === "create") {
        response = await fetch("/api/admin/transparency", {
          method: "POST",
          body: form,
        });
      } else {
        const body = Object.fromEntries(form.entries());
        response = await fetch(`/api/admin/transparency/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            expectedUpdatedAt: initial?.updatedAt,
          }),
        });
      }
      const result = (await response.json().catch(() => null)) as TransparencyFormResponse | null;
      if (!result) throw new Error("invalid_json_response");
      if (response.ok && typeof result.redirectTo === "string" && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }
      const nextFieldErrors = result.fieldErrors ?? {};

      setErrors(nextFieldErrors);

      if (result.error === "edit_conflict") {
        setFormError("다른 관리자가 수정했습니다. 새로고침 후 다시 시도해 주세요.");
      } else if (Object.keys(nextFieldErrors).length > 0) {
        setFormError("입력 내용을 확인해 주세요.");
      } else {
        setFormError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  const described = (name: string) => `${name}-help${errors[name] ? ` ${name}-error` : ""}`;
  return (
    <form onSubmit={submit} aria-busy={busy} className="min-w-0 max-w-4xl space-y-6">
      {formError ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {formError}
        </p>
      ) : null}
      {mode === "create" ? (
        <div className="border-b border-border pb-6">
          <label htmlFor="document" className="block font-semibold">
            PDF 파일 <span className="text-danger">*</span>
          </label>
          <input
            id="document"
            name="document"
            type="file"
            accept="application/pdf"
            required
            aria-invalid={Boolean(errors.document)}
            aria-describedby={described("document")}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-11 w-full"
          />
          <p id="document-help">
            PDF만 허용하며 최대 3MB입니다. {file ? `선택: ${file.name} (${file.size.toLocaleString()} bytes)` : ""}
          </p>
          {errors.document ? (
            <p id="document-error" role="alert" className="text-danger">
              {errors.document}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="border-l-4 border-warning bg-warning-soft px-4 py-3 font-semibold">
          PDF는 이 화면에서 교체할 수 없습니다. 문서 정보만 수정할 수 있습니다.
        </p>
      )}
      {fields.map(([name, label]) => (
        <div key={name} className="border-b border-border pb-6">
          <label htmlFor={name} className="block font-semibold">
            {label} <span className="text-danger">*</span>
          </label>
          <input
            id={name}
            name={name}
            type={name === "documentDate" ? "date" : "text"}
            required
            maxLength={name === "slug" ? 80 : name === "title" ? 140 : name === "periodLabel" ? 80 : undefined}
            pattern={name === "slug" ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined}
            autoCapitalize={name === "slug" ? "none" : undefined}
            spellCheck={name === "slug" ? false : undefined}
            defaultValue={initial?.[name] ?? ""}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={described(name)}
            className="min-h-11 w-full rounded-control border p-2"
          />
          <span id={`${name}-help`} className="sr-only">
            {label}을 입력해 주세요.
          </span>
          {errors[name] ? (
            <p id={`${name}-error`} role="alert" className="text-danger">
              {errors[name]}
            </p>
          ) : null}
        </div>
      ))}
      <div className="border-b border-border pb-6">
        <label htmlFor="category" className="block font-semibold">
          분류 <span className="text-danger">*</span>
        </label>
        <select
          id="category"
          name="category"
          defaultValue={initial?.category ?? ""}
          required
          aria-invalid={Boolean(errors.category)}
          aria-describedby={described("category")}
          className="min-h-11 w-full border"
        >
          <option value="">선택</option>
          <option value="operations">운영 보고</option>
          <option value="budget_settlement">예산·결산</option>
          <option value="donations">후원금</option>
          <option value="other">기타 공시</option>
        </select>
        <span id="category-help" className="sr-only">
          분류를 선택해 주세요.
        </span>
        {errors.category ? (
          <p id="category-error" role="alert">
            {errors.category}
          </p>
        ) : null}
      </div>
      <div className="border-b border-border pb-6">
        <label htmlFor="summary" className="block font-semibold">
          요약 (선택)
        </label>
        <textarea
          id="summary"
          name="summary"
          defaultValue={initial?.summary ?? ""}
          maxLength={500}
          aria-invalid={Boolean(errors.summary)}
          aria-describedby={described("summary")}
          className="w-full border p-2"
        />
        <span id="summary-help">500자 이하</span>
        {errors.summary ? (
          <p id="summary-error" role="alert">
            {errors.summary}
          </p>
        ) : null}
      </div>
      <div className="border-b border-border pb-6">
        <label htmlFor="privacyReviewStatus" className="block font-semibold">
          개인정보 검토 상태
        </label>
        <select
          id="privacyReviewStatus"
          name="privacyReviewStatus"
          defaultValue={initial?.privacyReviewStatus ?? "pending"}
          aria-invalid={Boolean(errors.privacyReviewStatus)}
          aria-describedby={described("privacyReviewStatus")}
          className="min-h-11 w-full border"
        >
          <option value="pending">확인 중</option>
          <option value="confirmed">확인 완료</option>
        </select>
        <span id="privacyReviewStatus-help" className="sr-only">
          개인정보 검토 상태
        </span>
        {errors.privacyReviewStatus ? (
          <p id="privacyReviewStatus-error" role="alert">
            {errors.privacyReviewStatus}
          </p>
        ) : null}
      </div>
      <div className="border-b border-border pb-6">
        <label htmlFor="finalDocumentStatus" className="block font-semibold">
          최종본 상태
        </label>
        <select
          id="finalDocumentStatus"
          name="finalDocumentStatus"
          defaultValue={initial?.finalDocumentStatus ?? "draft"}
          aria-invalid={Boolean(errors.finalDocumentStatus)}
          aria-describedby={described("finalDocumentStatus")}
          className="min-h-11 w-full border"
        >
          <option value="draft">작성본</option>
          <option value="final">최종본</option>
        </select>
        <span id="finalDocumentStatus-help" className="sr-only">
          최종본 상태
        </span>
        {errors.finalDocumentStatus ? (
          <p id="finalDocumentStatus-error" role="alert">
            {errors.finalDocumentStatus}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-control bg-primary px-6 font-bold text-primary-foreground"
        >
          {busy ? "저장 중…" : mode === "create" ? "비공개 초안 저장" : "문서 정보 저장"}
        </button>
        <Link
          href={mode === "create" ? "/admin/transparency" : `/admin/transparency/${id}`}
          className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 font-bold text-primary"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
