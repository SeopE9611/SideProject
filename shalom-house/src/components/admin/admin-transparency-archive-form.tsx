"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type TransparencyFormResponse = { error?: string; redirectTo?: string };
export function AdminTransparencyArchiveForm({ id, expectedUpdatedAt }: { id: string; expectedUpdatedAt: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const confirmed = new FormData(event.currentTarget).get("archiveConfirmed") === "on";
      const response = await fetch(`/api/admin/transparency/${id}/archive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archiveConfirmed: confirmed, expectedUpdatedAt }) });
      const result = (await response.json().catch(() => null)) as TransparencyFormResponse | null;
      if (!result) throw new Error("invalid_json_response");
      if (response.ok && typeof result.redirectTo === "string" && result.redirectTo) { router.push(result.redirectTo); router.refresh(); return; }
      setError(result.error === "edit_conflict" ? "다른 관리자가 수정했습니다. 새로고침 후 다시 시도해 주세요." : "보관하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} aria-busy={busy} className="space-y-3 rounded-card border border-danger p-5"><h2 className="font-bold">초안 보관</h2><p>보관하면 수정할 수 없습니다. Supabase Storage 원본은 유지됩니다.</p><label className="flex gap-2"><input type="checkbox" name="archiveConfirmed" required aria-invalid={error ? true : undefined} aria-describedby={error ? "archive-help archive-error" : "archive-help"} />위험 동작을 이해했으며 보관합니다.</label><p id="archive-help">영구 삭제가 아니며 PDF는 삭제되지 않습니다.</p>{error ? <p id="archive-error" role="alert">{error}</p> : null}<button disabled={busy} className="min-h-11 border px-4">{busy ? "보관 중…" : "초안 보관"}</button></form>;
}
