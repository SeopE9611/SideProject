"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type {
  DonationMethod,
  DonationPurpose,
  DonationReceiptStatus,
  DonationStatus,
} from "@/features/donations/donation.types";
type Option = { id: string; reference: string; displayName: string };
type Data = {
  donorId: string | null;
  anonymous: boolean;
  donatedOn: string;
  amountWon: number;
  method: DonationMethod;
  purpose: DonationPurpose;
  purposeDescription: string;
  receiptStatus: DonationReceiptStatus;
  receiptIssuedOn: string | null;
  status: DonationStatus;
  voidReason: string;
  internalNote: string;
};
const empty: Data = {
  donorId: null,
  anonymous: false,
  donatedOn: "",
  amountWon: 0,
  method: "bank_transfer",
  purpose: "general",
  purposeDescription: "",
  receiptStatus: "not_requested",
  receiptIssuedOn: null,
  status: "draft",
  voidReason: "",
  internalNote: "",
};
export function AdminDonationForm({
  id,
  expectedUpdatedAt,
  initial = empty,
  donors,
}: {
  id?: string;
  expectedUpdatedAt?: string;
  initial?: Data;
  donors: Option[];
}) {
  const [d, setD] = useState(initial),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({});
  const locked = !!id && initial.status === "confirmed",
    voided = !!id && initial.status === "voided";
  const set = <K extends keyof Data>(k: K, v: Data[K]) => {
    setD({ ...d, [k]: v });
    setConfirmed(false);
  };
  const field = (key: string) => errors[`donation.${key}`];
  const aria = (key: string) =>
    field(key) ? { "aria-invalid": true as const, "aria-describedby": `donation-${key}-error` } : {};
  const error = (key: string) =>
    field(key) && (
      <p id={`donation-${key}-error`} role="alert">
        {field(key)}
      </p>
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed) return setErrors({ saveConfirmed: "저장 확인이 필요합니다." });
    setBusy(true);
    setErrors({});
    try {
      const r = await fetch(id ? `/api/admin/donations/${id}` : "/api/admin/donations", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: expectedUpdatedAt ?? null, saveConfirmed: true, donation: d }),
      });
      let b: unknown;
      try {
        b = await r.json();
      } catch {
        return setErrors({ form: "서버 응답을 확인할 수 없습니다." });
      }
      if (typeof b !== "object" || b === null || Array.isArray(b))
        return setErrors({ form: "서버 응답을 확인할 수 없습니다." });
      const responseBody = b as Record<string, unknown>;
      if (!r.ok)
        return setErrors(
          (typeof responseBody.fieldErrors === "object" && responseBody.fieldErrors !== null
            ? (responseBody.fieldErrors as Record<string, string>)
            : undefined) ?? {
            form:
              (
                {
                  edit_conflict: "다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요.",
                  invalid_transition: "현재 기록 상태에서는 선택한 상태로 변경할 수 없습니다.",
                  immutable_fields: "확정되거나 무효 처리된 기록의 보호 필드는 수정할 수 없습니다.",
                  invalid_donor: "선택한 후원자 정보를 확인할 수 없습니다.",
                  donor_archived: "보관된 후원자로 새 후원금을 기록하거나 확정할 수 없습니다.",
                  invalid_document: "기존 후원 기록이 손상되어 수정할 수 없습니다.",
                } as Record<string, string>
              )[typeof responseBody.error === "string" ? responseBody.error : ""] ?? "저장하지 못했습니다.",
          },
        );
      if (typeof responseBody.redirectTo === "string" && responseBody.redirectTo.startsWith("/admin/donations/"))
        location.assign(responseBody.redirectTo);
      else setErrors({ form: "이동 경로가 올바르지 않습니다." });
    } catch {
      setErrors({ form: "네트워크 오류로 저장하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy} className="mt-6 max-w-4xl space-y-6">
      <p className="border-l-4 border-warning bg-warning-soft p-4">
        주민등록번호, 사업자등록번호, 계좌·카드번호, 건강·장애 정보와 입소자 개인정보는 입력하지 마세요. 영수증 상태는
        외부 처리 결과를 표시할 뿐 실제 영수증을 발급하지 않습니다.
      </p>
      {errors.form && (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {errors.form}
        </p>
      )}
      <label className="flex min-h-11 items-center gap-2">
        익명 후원
        <input
          id="donation-anonymous"
          {...aria("anonymous")}
          type="checkbox"
          disabled={locked || voided}
          checked={d.anonymous}
          onChange={(e) => {
            set("anonymous", e.target.checked);
            setD((x) => ({ ...x, anonymous: e.target.checked, donorId: null }));
          }}
        />
        {error("anonymous")}
      </label>
      <label className="block">
        후원자
        <select
          id="donation-donorId"
          {...aria("donorId")}
          className="block min-h-11"
          disabled={d.anonymous || locked || voided}
          required={!d.anonymous}
          value={d.donorId ?? ""}
          onChange={(e) => set("donorId", e.target.value || null)}
        >
          <option value="">선택</option>
          {donors.map((x) => (
            <option key={x.id} value={x.id}>
              {x.displayName} ({x.reference})
            </option>
          ))}
        </select>
        {error("donorId")}
      </label>
      <label className="block">
        후원 일자
        <input
          id="donation-donatedOn"
          {...aria("donatedOn")}
          type="date"
          required
          className="block min-h-11"
          disabled={locked || voided}
          value={d.donatedOn}
          onChange={(e) => set("donatedOn", e.target.value)}
        />
        {error("donatedOn")}
      </label>
      <label className="block">
        후원 금액
        <input
          id="donation-amountWon"
          {...aria("amountWon")}
          type="number"
          inputMode="numeric"
          min={1}
          max={1_000_000_000_000}
          step={1}
          required
          className="block min-h-11"
          disabled={locked || voided}
          value={d.amountWon || ""}
          onChange={(e) => set("amountWon", Number(e.target.value))}
        />
        <span>입력 금액: {new Intl.NumberFormat("ko-KR").format(d.amountWon)}원</span>
        {error("amountWon")}
      </label>
      <label className="block">
        후원 방식
        <select
          id="donation-method"
          {...aria("method")}
          disabled={locked || voided}
          value={d.method}
          onChange={(e) => set("method", e.target.value as Data["method"])}
        >
          <option value="bank_transfer">계좌이체</option>
          <option value="cash">현금</option>
          <option value="other">기타</option>
        </select>
        {error("method")}
      </label>
      <label className="block">
        후원 목적
        <select
          id="donation-purpose"
          {...aria("purpose")}
          disabled={locked || voided}
          value={d.purpose}
          onChange={(e) => {
            setD((x) => ({
              ...x,
              purpose: e.target.value as DonationPurpose,
              purposeDescription: e.target.value === "general" ? "" : x.purposeDescription,
            }));
            setConfirmed(false);
          }}
        >
          <option value="general">일반 후원</option>
          <option value="designated">지정 후원</option>
        </select>
        {error("purpose")}
      </label>
      {d.purpose === "designated" && (
        <label className="block">
          지정 후원 설명
          <input
            id="donation-purposeDescription"
            {...aria("purposeDescription")}
            disabled={locked || voided}
            required
            maxLength={300}
            value={d.purposeDescription}
            onChange={(e) => set("purposeDescription", e.target.value)}
          />
          {error("purposeDescription")}
        </label>
      )}
      <label className="block">
        영수증 처리 상태
        <select
          id="donation-receiptStatus"
          {...aria("receiptStatus")}
          disabled={voided}
          value={d.receiptStatus}
          onChange={(e) => {
            setD((x) => ({
              ...x,
              receiptStatus: e.target.value as DonationReceiptStatus,
              receiptIssuedOn: e.target.value === "issued" ? x.receiptIssuedOn : null,
            }));
            setConfirmed(false);
          }}
        >
          <option value="not_requested">미요청</option>
          <option value="requested">요청됨</option>
          <option value="issued">발급 완료</option>
        </select>
        {error("receiptStatus")}
      </label>
      {d.receiptStatus === "issued" && (
        <label className="block">
          영수증 발급 처리일
          <input
            id="donation-receiptIssuedOn"
            {...aria("receiptIssuedOn")}
            type="date"
            required
            disabled={voided}
            value={d.receiptIssuedOn ?? ""}
            onChange={(e) => set("receiptIssuedOn", e.target.value || null)}
          />
          {error("receiptIssuedOn")}
        </label>
      )}
      <label className="block">
        상태
        <select
          id="donation-status"
          {...aria("status")}
          disabled={voided}
          value={d.status}
          onChange={(e) => {
            setD((x) => ({
              ...x,
              status: e.target.value as DonationStatus,
              voidReason: e.target.value === "voided" ? x.voidReason : "",
            }));
            setConfirmed(false);
          }}
        >
          {!locked && <option value="draft">작성 중</option>}
          <option value="confirmed">확정</option>
          <option value="voided">무효</option>
        </select>
        {error("status")}
      </label>
      {d.status === "voided" && (
        <label className="block">
          무효 사유
          <input
            id="donation-voidReason"
            {...aria("voidReason")}
            disabled={voided}
            required
            minLength={10}
            maxLength={500}
            value={d.voidReason}
            onChange={(e) => set("voidReason", e.target.value)}
          />
          {error("voidReason")}
        </label>
      )}
      <label className="block">
        내부 메모
        <textarea
          id="donation-internalNote"
          {...aria("internalNote")}
          disabled={voided}
          maxLength={2000}
          value={d.internalNote}
          onChange={(e) => set("internalNote", e.target.value)}
        />
        {error("internalNote")}
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input
          id="donation-saveConfirmed"
          type="checkbox"
          required
          disabled={voided}
          checked={confirmed}
          aria-invalid={errors.saveConfirmed ? true : undefined}
          aria-describedby={errors.saveConfirmed ? "donation-saveConfirmed-error" : undefined}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        후원자, 후원 일자, 금액과 처리 상태를 확인했습니다.
      </label>
      {errors.saveConfirmed && (
        <p id="donation-saveConfirmed-error" role="alert">
          {errors.saveConfirmed}
        </p>
      )}
      {errors.expectedUpdatedAt && <p role="alert">{errors.expectedUpdatedAt}</p>}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={busy || voided}
          className="min-h-12 rounded-control bg-primary px-6 font-bold text-primary-foreground"
        >
          {busy ? "저장 중…" : id ? "변경 사항 저장" : "후원금 등록"}
        </button>
        <Link
          href={id ? `/admin/donations/${id}` : "/admin/donations"}
          className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 font-bold text-primary"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
