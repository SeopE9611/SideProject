"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
    <form onSubmit={submit} aria-busy={isBusy} className="space-y-3 rounded-card border p-5">
      <h2 className="font-bold">승인·반려</h2>
      <p>검토 결과를 확인하고 승인 또는 반려합니다.</p>
      <fieldset>
        <legend className="font-semibold">검토 결정</legend>
        <label className="mr-4">
          <input type="radio" name="decision" value="approve" required /> 승인
        </label>
        <label>
          <input type="radio" name="decision" value="reject" required /> 반려
        </label>
      </fieldset>
      <label htmlFor="transparency-decision-confirmed" className="flex gap-2">
        <input id="transparency-decision-confirmed" type="checkbox" required />
        선택한 검토 결과를 확인했습니다.
      </label>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={isBusy} className="min-h-11 border px-4 disabled:opacity-60">
        {isBusy ? "처리 중…" : "검토 결과 저장"}
      </button>
    </form>
  );
}
