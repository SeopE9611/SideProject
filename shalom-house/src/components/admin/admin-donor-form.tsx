"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { DonorStatus, DonorType } from "@/features/donations/donor.types";
type Props = {
  id?: string;
  expectedUpdatedAt?: string;
  initial?: {
    type: DonorType;
    status: DonorStatus;
    displayName: string;
    phone: string;
    email: string;
    internalNote: string;
  };
};
const empty = {
  type: "individual" as DonorType,
  status: "active" as DonorStatus,
  displayName: "",
  phone: "",
  email: "",
  internalNote: "",
};
const fieldClass =
  "w-full min-w-0 min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
const fieldGroupClass = "grid gap-2 border-b border-border pb-6 font-semibold";
export function AdminDonorForm({ id, expectedUpdatedAt, initial = empty }: Props) {
  const [d, setD] = useState(initial),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({});
  const change = (key: keyof typeof d, value: string) => {
    setD({ ...d, [key]: value });
    setConfirmed(false);
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed) {
      setErrors({ saveConfirmed: "저장 확인이 필요합니다." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const r = await fetch(id ? `/api/admin/donors/${id}` : "/api/admin/donors", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: expectedUpdatedAt ?? null, saveConfirmed: true, donor: d }),
      });
      let body: unknown;
      try {
        body = await r.json();
      } catch {
        setErrors({ form: "서버 응답을 확인할 수 없습니다." });
        return;
      }
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        setErrors({ form: "서버 응답을 확인할 수 없습니다." });
        return;
      }
      const responseBody = body as Record<string, unknown>;
      if (!r.ok) {
        setErrors(
          (typeof responseBody.fieldErrors === "object" && responseBody.fieldErrors !== null
            ? (responseBody.fieldErrors as Record<string, string>)
            : undefined) ?? {
            form:
              responseBody.error === "edit_conflict"
                ? "다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요."
                : "저장하지 못했습니다.",
          },
        );
        return;
      }
      if (typeof responseBody.redirectTo === "string" && responseBody.redirectTo.startsWith("/admin/donors/"))
        location.assign(responseBody.redirectTo);
      else setErrors({ form: "이동 경로가 올바르지 않습니다." });
    } catch {
      setErrors({ form: "네트워크 오류로 저장하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  }
  const field = (key: string) => errors[`donor.${key}`];
  const aria = (key: string) =>
    field(key) ? { "aria-invalid": true as const, "aria-describedby": `donor-${key}-error` } : {};
  const error = (key: string) =>
    field(key) && (
      <p id={`donor-${key}-error`} role="alert" className="mt-1 text-small font-semibold text-danger">
        {field(key)}
      </p>
    );
  return (
    <form onSubmit={submit} aria-busy={busy} className="max-w-4xl space-y-6">
      {errors.form && (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {errors.form}
        </p>
      )}
      <label className={fieldGroupClass}>
        후원자 유형
        <select
          id="donor-type"
          {...aria("type")}
          className={fieldClass}
          value={d.type}
          onChange={(e) => change("type", e.target.value)}
        >
          <option value="individual">개인</option>
          <option value="organization">단체·법인</option>
        </select>
        {error("type")}
      </label>
      <label className={fieldGroupClass}>
        표시 이름
        <input
          id="donor-displayName"
          {...aria("displayName")}
          required
          maxLength={100}
          className={fieldClass}
          value={d.displayName}
          onChange={(e) => change("displayName", e.target.value)}
          aria-invalid={!!field("displayName")}
        />
        {error("displayName")}
      </label>
      <label className={fieldGroupClass}>
        전화번호
        <input
          id="donor-phone"
          {...aria("phone")}
          type="tel"
          maxLength={30}
          pattern="\+?[0-9 ()-]{8,30}"
          autoComplete="tel"
          className={fieldClass}
          value={d.phone}
          onChange={(e) => change("phone", e.target.value)}
        />
        {error("phone")}
      </label>
      <label className={fieldGroupClass}>
        이메일
        <input
          id="donor-email"
          {...aria("email")}
          type="email"
          maxLength={254}
          autoComplete="email"
          className={fieldClass}
          value={d.email}
          onChange={(e) => change("email", e.target.value)}
        />
        {error("email")}
      </label>
      <label className={fieldGroupClass}>
        상태
        <select
          id="donor-status"
          {...aria("status")}
          className={fieldClass}
          value={d.status}
          onChange={(e) => change("status", e.target.value)}
        >
          <option value="active">이용 중</option>
          <option value="archived">보관</option>
        </select>
        {error("status")}
      </label>
      <label className={fieldGroupClass}>
        내부 메모
        <textarea
          id="donor-internalNote"
          {...aria("internalNote")}
          maxLength={2000}
          className={`${fieldClass} min-h-28`}
          value={d.internalNote}
          onChange={(e) => change("internalNote", e.target.value)}
        />
        {error("internalNote")}
      </label>
      <div className="border-l-4 border-warning bg-warning-soft p-4">
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input
            id="donor-saveConfirmed"
            type="checkbox"
            required
            checked={confirmed}
            aria-invalid={errors.saveConfirmed ? true : undefined}
            aria-describedby={errors.saveConfirmed ? "donor-saveConfirmed-error" : undefined}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          입력한 후원자 정보와 개인정보 취급 주의사항을 확인했습니다.
        </label>
        {errors.saveConfirmed && (
          <p id="donor-saveConfirmed-error" role="alert" className="mt-1 text-small font-semibold text-danger">
            {errors.saveConfirmed}
          </p>
        )}
      </div>
      {errors.expectedUpdatedAt && (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {errors.expectedUpdatedAt}
        </p>
      )}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-control bg-primary px-6 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "저장 중…" : id ? "변경 사항 저장" : "후원자 등록"}
        </button>
        <Link
          href={id ? `/admin/donors/${id}` : "/admin/donors"}
          className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
