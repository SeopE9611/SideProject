"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminWorkflowPanel } from "./admin-workflow-panel";
type ResponseBody = { error?: string; redirectTo?: string };
export function AdminTransparencyReviewDecisionForm({
  id,
  expectedUpdatedAt,
}: {
  id: string;
  expectedUpdatedAt: string;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setIsBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const decision = form.get("decision");
      const response = await fetch(`/api/admin/transparency/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ expectedUpdatedAt, decision }),
      });
      const result =
        response.headers.get("content-type")?.split(";", 1)[0] === "application/json"
          ? ((await response.json().catch(() => null)) as ResponseBody | null)
          : null;
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
          : "현재 상태에서는 승인 또는 반려할 수 없습니다.",
      );
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsBusy(false);
    }
  }
  return (
    <AdminWorkflowPanel title="승인·반려" description="검토 결과를 확인하고 승인 또는 반려합니다.">
    <form onSubmit={submit} aria-busy={isBusy} className="mt-5 max-w-3xl space-y-5">
      <fieldset className="space-y-3">
        <legend className="font-semibold">검토 결정</legend>
        <label className="flex items-start gap-3">
          <input type="radio" name="decision" value="approve" required className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
          <span><span className="font-semibold">승인</span><span className="block text-small text-muted-foreground">검토 완료 상태를 기록하고 게시 준비를 계속합니다.</span></span>
        </label>
        <label className="flex items-start gap-3">
          <input type="radio" name="decision" value="reject" required className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
          <span><span className="font-semibold">반려</span><span className="block text-small text-muted-foreground">수정할 수 있는 초안 상태로 되돌립니다.</span></span>
        </label>
      </fieldset>
      <label htmlFor="transparency-decision-confirmed" className="flex items-start gap-3 font-semibold">
        <input id="transparency-decision-confirmed" type="checkbox" required className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
        <span>선택한 검토 결과를 확인했습니다.</span>
      </label>
      {error ? (
        <p role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={isBusy} className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60">
        {isBusy ? "처리 중…" : "검토 결과 저장"}
      </button>
    </form>
    </AdminWorkflowPanel>
  );
}
