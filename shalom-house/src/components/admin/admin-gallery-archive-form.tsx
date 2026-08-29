"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminGalleryArchiveForm({
  id,
  expectedUpdatedAt,
}: {
  id: string;
  expectedUpdatedAt: string;
}) {
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
    <div className="space-y-3">
      <p>보관해도 비공개 Storage object는 영구 삭제되지 않습니다.</p>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void archive()}
        className="min-h-11 rounded-control border border-border-strong px-4 font-semibold disabled:opacity-60"
      >
        {busy ? "보관 중…" : "초안 보관"}
      </button>
    </div>
  );
}
