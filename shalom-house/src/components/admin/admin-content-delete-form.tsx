"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DELETE_CONFIRMATION } from "@/features/admin-trash/admin-trash.validation";
export type AdminContentDeleteFormProps = { id: string; title: string; endpoint: string; expectedUpdatedAt: string };
export function AdminContentDeleteForm({ id, title, endpoint, expectedUpdatedAt }: AdminContentDeleteFormProps) {
  const router = useRouter(), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const descriptionId = `delete-description-${id}`, errorId = `delete-error-${id}`;
  return <form aria-busy={busy} className="mt-4 space-y-4" onSubmit={async (event) => { event.preventDefault(); setError(""); if (!confirmed) { setError("확인 항목에 동의해 주세요."); return; } setBusy(true); try { const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt, confirmation: true }) }); let body: { error?: string } = {}; try { body = await response.json() as { error?: string }; } catch { setError("서버 응답을 확인할 수 없습니다."); return; } if (!response.ok) { setError(body.error === "edit_conflict" ? "다른 관리자가 먼저 변경했습니다. 새로고침 후 다시 시도해 주세요." : "휴지통으로 이동하지 못했습니다. 현재 상태를 확인해 주세요."); return; } router.push("/admin/trash?deleted=1"); router.refresh(); } catch { setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요."); } finally { setBusy(false); } }}>
    <p id={descriptionId}>삭제 대상: <strong>{title}</strong><br />휴지통 이동 즉시 공개 목록과 공개 파일 경로에서 제외됩니다.<br />원본 이미지와 PDF는 삭제하지 않습니다.</p>
    <label className="flex gap-3"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId} aria-invalid={error ? true : undefined} /> <span>{DELETE_CONFIRMATION} <strong>(필수)</strong></span></label>
    {error ? <p id={errorId} role="alert">{error}</p> : null}<button type="submit" disabled={busy} className="min-h-11 border border-foreground px-4 py-2 font-bold">{busy ? "처리 중…" : "휴지통으로 이동"}</button>
  </form>;
}
