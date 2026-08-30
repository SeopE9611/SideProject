"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminGalleryTransitionForm({
  id,
  expectedUpdatedAt,
  endpoint,
  label,
  description,
  confirmationField = "reviewConfirmed",
  danger = false,
  extra,
}: {
  id: string;
  expectedUpdatedAt: string;
  endpoint: string;
  label: string;
  description: string;
  confirmationField?: string;
  danger?: boolean;
  extra?: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const response = await fetch(
        `/api/admin/gallery/${encodeURIComponent(id)}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedUpdatedAt,
            ...extra,
            [confirmationField]: form.get("confirmed") === "on",
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;

      if (response.ok) {
        router.push(body?.redirectTo ?? `/admin/gallery/${id}`);
        router.refresh();
      } else {
        setError(
          body?.error === "edit_conflict"
            ? "다른 관리자가 먼저 변경했습니다. 상세 화면을 새로 확인해 주세요."
            : "현재 상태에서는 이 작업을 완료할 수 없습니다.",
        );
      }
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className={`grid gap-4 rounded-card border p-5 ${danger ? "border-danger" : ""}`}
    >
      <p className="font-semibold">{label}</p>
      <p className="text-safe-wrap text-small text-muted-foreground">
        {description}
      </p>
      <label className="flex items-start gap-3">
        <input
          name="confirmed"
          type="checkbox"
          required
          className="mt-1 size-5"
        />
        <span>위 내용을 확인했으며 이 작업을 진행합니다.</span>
      </label>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <button
        disabled={busy}
        className={`min-h-11 rounded-control px-5 font-semibold ${danger ? "bg-danger text-white" : "bg-primary text-primary-foreground"}`}
      >
        {busy ? "처리 중…" : label}
      </button>
    </form>
  );
}

export function AdminGalleryReviewForm(p: {
  id: string;
  expectedUpdatedAt: string;
}) {
  return (
    <AdminGalleryTransitionForm
      {...p}
      endpoint="review"
      label="검토 요청"
      description="초안 작성을 마치고 승인 검토를 요청합니다."
    />
  );
}
