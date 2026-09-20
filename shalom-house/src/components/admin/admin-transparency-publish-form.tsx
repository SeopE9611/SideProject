"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminWorkflowPanel } from "./admin-workflow-panel";
type ResponseBody = { error?: string; redirectTo?: string };
export function AdminTransparencyPublishForm({ id, expectedUpdatedAt }: { id: string; expectedUpdatedAt: string }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setIsBusy(true);
    setError("");
    try {
      const confirmed = new FormData(event.currentTarget).get("publishConfirmed") === "on";
      const response = await fetch(`/api/admin/transparency/${encodeURIComponent(id)}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          expectedUpdatedAt,
          publishConfirmed: confirmed,
        }),
      });
      const mediaType = response.headers.get("content-type")?.split(";", 1)[0];
      const result =
        mediaType === "application/json" ? ((await response.json().catch(() => null)) as ResponseBody | null) : null;
      if (response.ok && result?.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      setError(
        result?.error === "edit_conflict"
          ? "다른 관리자가 수정했습니다. 상세 화면을 새로고침한 뒤 다시 시도해 주세요."
          : result?.error?.startsWith("not_ready")
            ? "개인정보 검토 완료와 최종본 여부를 다시 확인해 주세요."
            : "현재 상태에서는 처리할 수 없습니다. 상세 화면을 새로 확인해 주세요.",
      );
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsBusy(false);
    }
  }
  return (
    <AdminWorkflowPanel title="게시" description="게시하면 자료공개 페이지에서 PDF를 열 수 있습니다.">
    <form onSubmit={submit} aria-busy={isBusy} className="mt-5 max-w-3xl space-y-5">
      <label htmlFor="transparency-publish-confirmed" className="flex items-start gap-3 font-semibold">
        <input id="transparency-publish-confirmed" name="publishConfirmed" type="checkbox" required className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
        <span>게시 확인</span>
      </label>
      {error ? (
        <p role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={isBusy} className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60">
        {isBusy ? "게시 중…" : "게시"}
      </button>
    </form>
    </AdminWorkflowPanel>
  );
}
