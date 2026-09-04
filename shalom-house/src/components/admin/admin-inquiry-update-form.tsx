"use client";
import { useState, type FormEvent } from "react";
import { inquiryStatusLabels, type InquiryStatus } from "@/features/inquiries/inquiry.types";
type ResponseBody = { error?: string; fieldErrors?: Record<string, string>; redirectTo?: string };
export function AdminInquiryUpdateForm({
  id,
  expectedUpdatedAt,
  initialStatus,
  initialInternalNote,
}: {
  id: string;
  expectedUpdatedAt: string;
  initialStatus: InquiryStatus;
  initialInternalNote: string;
}) {
  const transitions: Record<InquiryStatus, InquiryStatus[]> = {
    received: ["received", "in_review", "completed"],
    in_review: ["in_review", "contacted", "completed"],
    contacted: ["contacted", "in_review", "completed"],
    completed: ["completed", "in_review", "archived"],
    archived: ["archived", "in_review"],
  };
  const options = transitions[initialStatus];
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialInternalNote);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (key: string) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt, updateConfirmed: confirmed, status, internalNote: note }),
      });
      const body: ResponseBody | null = await response.json().catch(() => null);
      if (
        response.ok &&
        typeof body?.redirectTo === "string" &&
        body.redirectTo.length > 0 &&
        body.redirectTo.startsWith(`/admin/inquiries/${id}`)
      )
        location.assign(body.redirectTo);
      else if (body?.error === "validation") {
        setErrors(body.fieldErrors ?? {});
        setMessage("입력 내용을 확인해 주세요.");
      } else
        setMessage(
          body?.error === "edit_conflict"
            ? "다른 관리자가 문의를 먼저 변경했습니다. 새로고침 후 다시 확인해 주세요."
            : body?.error === "invalid_transition"
              ? "현재 상태에서 선택한 상태로 변경할 수 없습니다. 페이지를 새로고침해 주세요."
              : "문의 처리 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
    } catch {
      setMessage("문의 처리 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy} className="space-y-5">
      {(errors.expectedUpdatedAt || errors.form) && (
        <div id="inquiry-update-form-error" role="alert" className="space-y-1 text-small text-danger">
          {errors.expectedUpdatedAt && <p>{errors.expectedUpdatedAt}</p>}
          {errors.form && <p>{errors.form}</p>}
        </div>
      )}
      <div>
        <label className="font-bold" htmlFor="inquiry-status">
          처리 상태
        </label>
        <select
          id="inquiry-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as InquiryStatus);
            setConfirmed(false);
            clearError("status");
          }}
          aria-invalid={errors.status ? true : undefined}
          aria-describedby={errors.status ? "inquiry-status-error" : undefined}
          className="mt-2 block min-h-11 w-full rounded-control border p-2"
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {inquiryStatusLabels[s]}
            </option>
          ))}
        </select>
        {errors.status && (
          <p id="inquiry-status-error" role="alert" className="mt-1 text-small text-danger">
            {errors.status}
          </p>
        )}
      </div>
      <div>
        <label className="font-bold" htmlFor="inquiry-internal-note">
          내부 메모
        </label>
        <textarea
          id="inquiry-internal-note"
          rows={8}
          maxLength={2000}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setConfirmed(false);
            clearError("internalNote");
          }}
          aria-invalid={errors.internalNote ? true : undefined}
          aria-describedby={`inquiry-internal-note-help${errors.internalNote ? " inquiry-internal-note-error" : ""}`}
          className="mt-2 block w-full rounded-control border p-2"
        />
        <p id="inquiry-internal-note-help" className="mt-2 text-small font-bold">
          내부 메모에도 주민등록번호, 계좌·카드번호, 건강·장애 정보와 입소자 개인정보를 기록하지 마세요.
        </p>
        {errors.internalNote && (
          <p id="inquiry-internal-note-error" role="alert" className="mt-1 text-small text-danger">
            {errors.internalNote}
          </p>
        )}
      </div>
      <div>
        <label className="flex gap-3" htmlFor="inquiry-update-confirmed">
          <input
            id="inquiry-update-confirmed"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              clearError("updateConfirmed");
            }}
            aria-invalid={errors.updateConfirmed ? true : undefined}
            aria-describedby={errors.updateConfirmed ? "inquiry-update-confirmed-error" : undefined}
          />
          <span>선택한 처리 상태와 내부 메모를 확인했습니다.</span>
        </label>
        {errors.updateConfirmed && (
          <p id="inquiry-update-confirmed-error" role="alert" className="mt-1 text-small text-danger">
            {errors.updateConfirmed}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 rounded-control bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50"
      >
        저장
      </button>
      <p role="alert">{message}</p>
    </form>
  );
}
