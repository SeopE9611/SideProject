"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminWorkflowPanel } from "./admin-workflow-panel";
export function AdminGalleryArchiveForm({ id, expectedUpdatedAt }: { id: string; expectedUpdatedAt: string }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function archive() {
    setBusy(true);
    const response = await fetch(`/api/admin/gallery/${id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ expectedUpdatedAt, archiveConfirmed: true }),
    });
    const body = (await response.json().catch(() => null)) as {
      redirectTo?: string;
    } | null;
    if (response.ok && body?.redirectTo) {
      router.push(body.redirectTo);
      router.refresh();
      return;
    }
    setError("보관할 수 없습니다. 최신 상태를 확인해 주세요.");
    setBusy(false);
  }
  return (
    <AdminWorkflowPanel
      title="초안 보관"
      description="보관해도 비공개 Storage object는 영구 삭제되지 않습니다."
      tone="danger"
    >
      <div className="mt-5 max-w-3xl space-y-5">
        {error ? (
          <p role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void archive()}
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-danger px-5 py-2 font-semibold text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "보관 중…" : "초안 보관"}
        </button>
      </div>
    </AdminWorkflowPanel>
  );
}
