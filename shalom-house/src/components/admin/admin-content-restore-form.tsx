"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RESTORE_CONFIRMATION } from "@/features/admin-trash/admin-trash.validation";
export function AdminContentRestoreForm({
  id,
  endpoint,
  expectedUpdatedAt,
}: {
  id: string;
  endpoint: string;
  expectedUpdatedAt: string;
}) {
  const router = useRouter(),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const descriptionId = `restore-description-${id}`,
    errorId = `restore-error-${id}`;
  return (
    <form
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (!confirmed) {
          setError("확인 항목에 동의해 주세요.");
          return;
        }
        setBusy(true);
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expectedUpdatedAt, confirmation: true }),
          });
          let body: { error?: string } = {};
          try {
            body = (await response.json()) as { error?: string };
          } catch {
            setError("서버 응답을 확인할 수 없습니다.");
            return;
          }
          if (!response.ok) {
            const messages: Record<string, string> = {
              edit_conflict: "다른 관리자가 먼저 변경했습니다.",
              slug_conflict: "같은 slug의 활성 콘텐츠가 있어 복구할 수 없습니다.",
              document_duplicate: "같은 PDF 문서가 있어 복구할 수 없습니다.",
              not_restorable: "이미 복구되었거나 복구할 수 없는 상태입니다.",
            };
            setError(messages[body.error ?? ""] ?? "복구하지 못했습니다.");
            return;
          }
          router.push("/admin/trash?restored=1");
          router.refresh();
        } catch {
          setError("네트워크 연결을 확인해 주세요.");
        } finally {
          setBusy(false);
        }
      }}
      className="min-w-0 space-y-4"
    >
      <p id={descriptionId} className="text-small text-muted-foreground">복구하면 게시 상태와 승인 상태가 초기화되며 초안부터 다시 검토해야 합니다.</p>
      <label className="flex items-start gap-3 border-l-4 border-warning bg-warning-soft p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        />
        <span className="text-small font-semibold">
          {RESTORE_CONFIRMATION} <strong>(필수)</strong>
        </span>
      </label>
      {error ? (
        <p id={errorId} role="alert" className="rounded-control border border-border-strong bg-background p-4 text-small font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-5 py-2 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60" disabled={busy}>
        {busy ? "복구 중…" : "복구"}
      </button>
    </form>
  );
}
