"use client";

import { useId, useRef } from "react";
import { uploadAdminPdf } from "@/lib/client-pdf-transfer";

export type DraftPdf = { label: string; originalFileName: string; byteSize: number };
export type DraftPdfChange = { file: File } | { remove: true } | null;
type Domain = "news" | "programs";
const PDF_MAX_BYTES = 10 * 1024 * 1024;

export async function saveDraftPdf(
  domain: Domain,
  saved: { id: unknown; updatedAt: unknown },
  change: NonNullable<DraftPdfChange>,
  label: string,
  confirmed: boolean,
): Promise<string | null> {
  if (typeof saved.id !== "string" || !/^[a-f0-9]{24}$/.test(saved.id) ||
      typeof saved.updatedAt !== "string") return "attachment_outcome_unknown";
  const endpoint = `/api/admin/${domain}/${saved.id}/attachment`;
  try {
    let response: Response;
    if ("file" in change) {
      response = await uploadAdminPdf(endpoint, change.file, saved.updatedAt, label, confirmed);
    } else {
      response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: saved.updatedAt, removeConfirmed: true }),
      });
    }
    const result = await response.json();
    if (response.ok && result?.ok === true) return null;
    return typeof result?.error === "string" ? result.error : "attachment_outcome_unknown";
  } catch {
    return "attachment_outcome_unknown";
  }
}

export function draftPdfRecoveryMessage(error: string): string {
  switch (error) {
    case "attachment_cleanup_pending":
      return "본문과 첨부 변경은 저장했습니다. 이전 파일 또는 임시 파일 정리에 실패했습니다.";
    case "upload_failed":
      return "본문은 저장했습니다. PDF 전송에 실패했습니다.";
    case "invalid_pdf":
    case "validation":
      return "본문은 저장했습니다. PDF 크기·형식·파일 서명을 확인해 주세요.";
    case "edit_conflict":
    case "not_editable":
      return "본문은 저장했습니다. 글이 다시 수정됐거나 게시 상태가 바뀌어 PDF 변경을 적용하지 못했습니다.";
    case "staging_cleanup_pending":
      return "본문은 저장했습니다. PDF 처리를 완료하지 못했고 파일 정리가 필요합니다.";
    default:
      return "본문은 저장했습니다. PDF 처리 결과를 확인하지 못했습니다.";
  }
}

export function AdminDraftPdf({
  existing, change, disabled, onChange, error, onError,
}: {
  existing?: DraftPdf | null;
  change: DraftPdfChange;
  disabled: boolean;
  onChange: (change: DraftPdfChange) => void;
  error: string | null;
  onError: (message: string | null) => void;
}) {
  const id = useId();
  const safety = useRef<HTMLInputElement>(null);
  const file = change && "file" in change ? change.file : null;
  const removing = change && "remove" in change;
  const size = (bytes: number) => `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3 rounded-control border border-border p-4">
      <legend className="px-1 font-semibold">PDF 첨부</legend>
      <p className="text-small text-muted-foreground">PDF 1개, 최대 10MB. 본문 저장 후 첨부를 처리합니다.</p>
      {existing ? (
        <p className="break-words text-small">현재 첨부 · {existing.originalFileName} ({size(existing.byteSize)})</p>
      ) : null}
      <label htmlFor={id} className="block text-small font-medium">{existing ? "교체할 PDF" : "첨부할 PDF"}</label>
      <input id={id} type="file" accept="application/pdf,.pdf" data-unsaved-ignore
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
        className="block w-full min-w-0 text-small focus-visible:outline-2 focus-visible:outline-focus-ring"
        onChange={(event) => {
          const input = event.currentTarget;
          const selected = input.files?.[0];
          input.value = "";
          if (!selected) return;
          if (selected.type !== "application/pdf" || !/\.pdf$/i.test(selected.name) || selected.size < 1 || selected.size > PDF_MAX_BYTES) {
            onError("비어 있지 않은 10MB 이하 PDF 파일을 선택해 주세요.");
            return;
          }
          onError(null);
          if (safety.current) safety.current.checked = false;
          onChange({ file: selected });
        }}
      />
      {file ? (
        <div className="flex flex-wrap items-center gap-2 text-small">
          <span className="min-w-0 break-all">저장 대기 · {file.name} ({size(file.size)})</span>
          <button type="button" aria-label="선택한 PDF 제거" onClick={() => { onError(null); onChange(null); }}
            className="min-h-11 min-w-11 rounded-control border border-border focus-visible:outline-2 focus-visible:outline-focus-ring">×</button>
        </div>
      ) : null}
      {existing && !file ? (
        <button type="button" onClick={() => { onError(null); onChange(removing ? null : { remove: true }); }}
          className="min-h-11 rounded-control border border-border px-3 text-small focus-visible:outline-2 focus-visible:outline-focus-ring">
          {removing ? "저장 시 제거 예정 · 취소" : "저장할 때 기존 PDF 제거"}
        </button>
      ) : null}
      {file ? (
        <label className="flex items-start gap-2 text-small">
          <input ref={safety} type="checkbox" name="draftPdfSafetyConfirmed" required data-unsaved-ignore className="mt-1" />
          PDF에 개인정보나 공개 권한이 없는 내용이 포함되지 않았음을 확인했습니다.
        </label>
      ) : null}
      {error ? (
        <div>
          <p id={`${id}-error`} role="alert" className="text-small text-danger">{error}</p>
          <button type="button" onClick={() => onError(null)} className="min-h-11 text-small underline focus-visible:outline-2 focus-visible:outline-focus-ring">
            잘못된 파일 선택 취소
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
