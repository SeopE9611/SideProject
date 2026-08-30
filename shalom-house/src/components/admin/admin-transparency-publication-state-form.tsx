"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type ResponseBody = { error?: string; redirectTo?: string };
export function AdminTransparencyPublicationStateForm({ id, expectedUpdatedAt }: { id: string; expectedUpdatedAt: string }) {
  const router = useRouter(); const [isBusy, setIsBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (isBusy) return; setIsBusy(true); setError("");
    try {
      const confirmed = new FormData(event.currentTarget).get("transitionConfirmed") === "on";
      const response = await fetch(`/api/admin/transparency/${encodeURIComponent(id)}/publication`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "same-origin", body: JSON.stringify({ expectedUpdatedAt, action: "unpublish", transitionConfirmed: confirmed }) });
      const mediaType = response.headers.get("content-type")?.split(";", 1)[0];
      const result = mediaType === "application/json" ? await response.json().catch(() => null) as ResponseBody | null : null;
      if (response.ok && result?.redirectTo) { router.push(result.redirectTo); router.refresh(); return; }
      if (response.status === 401) { router.replace("/admin/login"); return; }
      setError(result?.error === "edit_conflict" ? "다른 관리자가 수정했습니다. 상세 화면을 새로고침한 뒤 다시 시도해 주세요." : result?.error?.startsWith("not_ready") ? "개인정보 검토 완료와 최종본 여부를 다시 확인해 주세요." : "현재 상태에서는 처리할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
    } catch { setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요."); } finally { setIsBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={isBusy} className="space-y-3 rounded-card border p-5"><h2 className="font-bold">게시 중단</h2><p>게시를 중단하면 공개 목록과 공개 PDF 경로에서 즉시 제외됩니다. Storage 원본은 유지됩니다.</p><label htmlFor="transparency-publication-state-confirmed" className="flex gap-2"><input id="transparency-publication-state-confirmed" name="transitionConfirmed" type="checkbox" required />게시 중단 확인</label>{error ? <p role="alert" className="text-danger">{error}</p> : null}<button type="submit" disabled={isBusy} className="min-h-11 border px-4 disabled:opacity-60">{isBusy ? "처리 중…" : "게시 중단"}</button></form>;
}
