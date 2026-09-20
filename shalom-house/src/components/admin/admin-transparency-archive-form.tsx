"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminWorkflowPanel } from "./admin-workflow-panel";
type TransparencyFormResponse = { error?: string; redirectTo?: string };
export function AdminTransparencyArchiveForm({ id, expectedUpdatedAt }: { id: string; expectedUpdatedAt: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const confirmed = new FormData(event.currentTarget).get("archiveConfirmed") === "on";
      const response = await fetch(`/api/admin/transparency/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archiveConfirmed: confirmed,
          expectedUpdatedAt,
        }),
      });
      const result = (await response.json().catch(() => null)) as TransparencyFormResponse | null;
      if (!result) throw new Error("invalid_json_response");
      if (response.ok && typeof result.redirectTo === "string" && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }
      setError(
        result.error === "edit_conflict"
          ? "다른 관리자가 수정했습니다. 새로고침 후 다시 시도해 주세요."
          : "보관하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminWorkflowPanel title="초안 보관" description="보관하면 수정할 수 없습니다. Supabase Storage 원본은 유지됩니다." tone="danger">
    <form onSubmit={submit} aria-busy={busy} className="mt-5 max-w-3xl space-y-5">
      <label className="flex items-start gap-3 font-semibold">
        <input
          type="checkbox"
          name="archiveConfirmed"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "archive-help archive-error" : "archive-help"}
          className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        />
        <span>위험 동작을 이해했으며 보관합니다.</span>
      </label>
      <p id="archive-help" className="text-small text-muted-foreground">영구 삭제가 아니며 PDF는 삭제되지 않습니다.</p>
      {error ? (
        <p id="archive-error" role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">
          {error}
        </p>
      ) : null}
      <button disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-control border border-danger px-5 py-2 font-semibold text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? "보관 중…" : "초안 보관"}
      </button>
    </form>
    </AdminWorkflowPanel>
  );
}
