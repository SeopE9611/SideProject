"use client";
import Link from "next/link";
import type { FacilitySpaceInput } from "@/features/facility-spaces/facility-space.types";
import {
  validateFacilitySpaceInput,
  type FacilitySpaceFieldErrors,
} from "@/features/facility-spaces/facility-space.validation";
import { useState, type FormEvent } from "react";
export type AdminFacilitySpaceFormProps = {
  mode: "create" | "edit";
  id?: string;
  expectedUpdatedAt: string | null;
  initialSpace: FacilitySpaceInput;
};
export function AdminFacilitySpaceForm({ mode, id, expectedUpdatedAt, initialSpace }: AdminFacilitySpaceFormProps) {
  const [space, setSpace] = useState(initialSpace);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<FacilitySpaceFieldErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FacilitySpaceInput>(key: K, value: FacilitySpaceInput[K]) =>
    setSpace((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const validation = validateFacilitySpaceInput(space);
    if (!validation.ok || !confirmed) {
      setErrors({
        ...(!validation.ok ? validation.fieldErrors : {}),
        ...(!confirmed ? { saveConfirmed: "공개 가능한 내용인지 확인해 주세요." } : {}),
      });
      setMessage("입력 내용을 확인해 주세요.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/site-content/spaces" : `/api/admin/site-content/spaces/${id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedUpdatedAt, saveConfirmed: true, space: validation.value }),
        },
      );
      let body: { error?: string; redirectTo?: string; fieldErrors?: FacilitySpaceFieldErrors };
      try {
        body = await response.json();
      } catch {
        setMessage("생활공간 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (!response.ok || !body.redirectTo) {
        if (body.error === "validation") {
          setErrors(body.fieldErrors ?? {});
          setMessage("입력 내용을 확인해 주세요.");
          return;
        }
        setMessage(
          body.error === "edit_conflict"
            ? "다른 관리자가 공간 정보를 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요."
            : body.error === "invalid_transition"
              ? "보관된 공간은 초안으로 복구한 뒤 공개할 수 있습니다."
              : "생활공간 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      window.location.assign(body.redirectTo);
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  const error = (key: keyof FacilitySpaceFieldErrors) =>
    errors[key] ? (
      <p id={`${key}-error`} role="alert" className="text-small font-semibold text-danger">
        {errors[key]}
      </p>
    ) : null;
  return (
    <form className="max-w-4xl space-y-6" onSubmit={submit} aria-busy={busy}>
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="font-semibold" htmlFor="title">
          공간명 <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          required
          maxLength={100}
          className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          value={space.title}
          onChange={(e) => set("title", e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {error("title")}
      </div>
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="font-semibold" htmlFor="description">
          공간 설명 <span className="text-danger">*</span>
        </label>
        <p id="description-help" className="text-small text-muted-foreground">
          입소자 개인정보와 시설 보안에 영향을 줄 수 있는 상세 위치·출입 정보는 입력하지 마세요.
        </p>
        <textarea
          id="description"
          required
          minLength={10}
          maxLength={800}
          rows={8}
          className="w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          value={space.description}
          onChange={(e) => set("description", e.target.value)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={`description-help${errors.description ? " description-error" : ""}`}
        />
        {error("description")}
      </div>
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="font-semibold" htmlFor="publicationStatus">
          공개 상태
        </label>
        <select
          id="publicationStatus"
          className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          value={space.publicationStatus}
          onChange={(e) => set("publicationStatus", e.target.value as FacilitySpaceInput["publicationStatus"])}
          aria-invalid={errors.publicationStatus ? true : undefined}
          aria-describedby={errors.publicationStatus ? "publicationStatus-error" : undefined}
        >
          <option value="draft">초안</option>
          <option value="published">공개</option>
          <option value="archived">보관</option>
        </select>
        {error("publicationStatus")}
      </div>
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="font-semibold" htmlFor="displayOrder">
          표시 순서 <span className="text-danger">*</span>
        </label>
        <input
          id="displayOrder"
          type="number"
          required
          min={1}
          max={999}
          className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          value={space.displayOrder}
          onChange={(e) => set("displayOrder", Number(e.target.value))}
          aria-invalid={errors.displayOrder ? true : undefined}
          aria-describedby={errors.displayOrder ? "displayOrder-error" : undefined}
        />
        {error("displayOrder")}
      </div>
      <div>
        <div className="border-l-4 border-warning bg-warning-soft p-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} aria-invalid={errors.saveConfirmed ? true : undefined} aria-describedby={errors.saveConfirmed ? "saveConfirmed-error" : undefined} className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
            <span className="font-semibold">입력한 공간 설명이 개인정보와 시설 보안상 공개 가능한 내용임을 확인했습니다.</span>
          </label>
        </div>
        {errors.saveConfirmed ? (
          <p id="saveConfirmed-error" role="alert" className="mt-2 text-small font-semibold text-danger">
            {errors.saveConfirmed}
          </p>
        ) : null}
      </div>
      {message ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 py-2 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "저장 중…" : mode === "create" ? "생활공간 저장" : "변경 사항 저장"}
        </button>
        <Link href={mode === "create" ? "/admin/site-content/spaces" : `/admin/site-content/spaces/${id}`} className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 py-2 font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">취소</Link>
      </div>
    </form>
  );
}
