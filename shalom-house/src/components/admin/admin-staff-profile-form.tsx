"use client";
import { useState, type FormEvent } from "react";
import type { StaffProfileInput } from "@/features/staff/staff.types";
import { validateStaffProfileInput, type StaffProfileFieldErrors } from "@/features/staff/staff.validation";
export type AdminStaffProfileFormProps = {
  mode: "create" | "edit";
  id?: string;
  expectedUpdatedAt: string | null;
  initialProfile: StaffProfileInput;
};
function joinDescriptionIds(...ids: Array<string | false | null | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(" ");
  return value || undefined;
}
export function AdminStaffProfileForm({ mode, id, expectedUpdatedAt, initialProfile }: AdminStaffProfileFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<StaffProfileFieldErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof StaffProfileInput>(key: K, value: StaffProfileInput[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const validation = validateStaffProfileInput(profile);
    if (!validation.ok || !confirmed) {
      setErrors({
        ...(!validation.ok ? validation.fieldErrors : {}),
        ...(!confirmed ? { saveConfirmed: "입력한 정보와 공개 범위를 확인해 주세요." } : {}),
      });
      setMessage("입력 내용을 확인해 주세요.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/site-content/staff" : `/api/admin/site-content/staff/${id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedUpdatedAt,
            saveConfirmed: true,
            profile: validation.value,
          }),
        },
      );
      let body: {
        error?: string;
        redirectTo?: string;
        fieldErrors?: StaffProfileFieldErrors;
      };
      try {
        body = await response.json();
      } catch {
        setMessage("직원 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
            ? "다른 관리자가 직원 정보를 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요."
            : body.error === "invalid_transition"
              ? "보관된 직원 정보는 초안으로 복구한 뒤 공개할 수 있습니다."
              : "직원 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
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
  const textField = (key: "role" | "name" | "nameDisclosureReference", label: string, help?: string) => (
    <div>
      <label className="font-bold" htmlFor={key}>
        {label}
      </label>
      <input
        id={key}
        required={key === "role" || (key === "nameDisclosureReference" && profile.showName)}
        maxLength={key === "role" || key === "name" ? 80 : 120}
        className="mt-2 min-h-11 w-full rounded-control border px-3"
        value={profile[key]}
        disabled={key === "nameDisclosureReference" && !profile.showName}
        onChange={(e) =>
          key === "name"
            ? setProfile((current) => ({
                ...current,
                name: e.target.value,
                ...(current.showName
                  ? {
                      nameDisclosureConfirmed: false,
                      nameDisclosureReference: "",
                    }
                  : {}),
              }))
            : key === "nameDisclosureReference"
              ? setProfile((current) => ({
                  ...current,
                  nameDisclosureReference: e.target.value,
                  nameDisclosureConfirmed: false,
                }))
              : set(key, e.target.value)
        }
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={joinDescriptionIds(
          help ? `${key}-help` : undefined,
          errors[key] ? `${key}-error` : undefined,
        )}
      />
      {help ? (
        <p id={`${key}-help`} className="mt-1 text-small text-muted-foreground">
          {help}
        </p>
      ) : null}
      {errors[key] ? (
        <p id={`${key}-error`} role="alert" className="mt-1 text-small text-destructive">
          {errors[key]}
        </p>
      ) : null}
    </div>
  );
  return (
    <form className="space-y-6 rounded-card border p-5" onSubmit={submit} aria-busy={busy}>
      {textField("role", "직책·역할")}
      <div>
        <label className="font-bold" htmlFor="responsibility">
          담당 업무
        </label>
        <textarea
          id="responsibility"
          required
          minLength={10}
          maxLength={600}
          rows={6}
          className="mt-2 w-full rounded-control border p-3"
          value={profile.responsibility}
          onChange={(e) => set("responsibility", e.target.value)}
          aria-invalid={errors.responsibility ? true : undefined}
          aria-describedby={errors.responsibility ? "responsibility-error" : undefined}
        />
        {errors.responsibility ? (
          <p id="responsibility-error" role="alert" className="text-destructive">
            {errors.responsibility}
          </p>
        ) : null}
      </div>
      {textField("name", "직원 이름")}
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={profile.showName}
          onChange={(e) =>
            setProfile((current) => ({
              ...current,
              showName: e.target.checked,
              nameDisclosureConfirmed: false,
              nameDisclosureReference: "",
            }))
          }
          aria-invalid={errors.showName ? true : undefined}
          aria-describedby={joinDescriptionIds("showName-help", errors.showName ? "showName-error" : undefined)}
        />
        <span>
          <b>이름 공개</b>
          <span id="showName-help" className="block text-small text-muted-foreground">
            이름은 직원 본인의 홈페이지 공개 확인을 마친 경우에만 표시합니다.
          </span>
          {errors.showName ? (
            <span id="showName-error" role="alert">
              {errors.showName}
            </span>
          ) : null}
        </span>
      </label>
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={profile.nameDisclosureConfirmed}
          disabled={!profile.showName}
          onChange={(e) => set("nameDisclosureConfirmed", e.target.checked)}
          aria-invalid={errors.nameDisclosureConfirmed ? true : undefined}
          aria-describedby={joinDescriptionIds(
            "disclosure-help",
            errors.nameDisclosureConfirmed ? "disclosure-error" : undefined,
          )}
        />
        <span>
          <b>이름 공개 확인</b>
          <span id="disclosure-help" className="block text-small text-muted-foreground">
            직원 본인의 홈페이지 공개 확인 여부입니다.
          </span>
          {errors.nameDisclosureConfirmed ? (
            <span id="disclosure-error" role="alert" className="block text-destructive">
              {errors.nameDisclosureConfirmed}
            </span>
          ) : null}
        </span>
      </label>
      {textField(
        "nameDisclosureReference",
        "이름 공개 확인 근거",
        "동의서 또는 내부 확인 기록을 식별할 수 있는 내부 참조값을 입력합니다. 이 값은 공개되지 않습니다.",
      )}
      <div>
        <label className="font-bold" htmlFor="publicationStatus">
          공개 상태
        </label>
        <select
          id="publicationStatus"
          className="mt-2 min-h-11 w-full border px-3"
          value={profile.publicationStatus}
          onChange={(e) => set("publicationStatus", e.target.value as StaffProfileInput["publicationStatus"])}
          aria-invalid={errors.publicationStatus ? true : undefined}
          aria-describedby={errors.publicationStatus ? "publicationStatus-error" : undefined}
        >
          <option value="draft">초안</option>
          <option value="published">공개</option>
          <option value="archived">보관</option>
        </select>
        {errors.publicationStatus ? (
          <p id="publicationStatus-error" role="alert">
            {errors.publicationStatus}
          </p>
        ) : null}
      </div>
      <div>
        <label className="font-bold" htmlFor="displayOrder">
          표시 순서
        </label>
        <input
          id="displayOrder"
          type="number"
          required
          min={1}
          max={999}
          className="mt-2 min-h-11 w-full border px-3"
          value={profile.displayOrder}
          onChange={(e) => set("displayOrder", Number(e.target.value))}
          aria-invalid={errors.displayOrder ? true : undefined}
          aria-describedby={errors.displayOrder ? "displayOrder-error" : undefined}
        />
        {errors.displayOrder ? (
          <p id="displayOrder-error" role="alert">
            {errors.displayOrder}
          </p>
        ) : null}
      </div>
      <label className="flex gap-3">
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          aria-invalid={errors.saveConfirmed ? true : undefined}
          aria-describedby={joinDescriptionIds("save-help", errors.saveConfirmed ? "save-error" : undefined)}
        />
        <span>
          <b id="save-help">입력한 직원 정보와 공개 범위를 확인했습니다.</b>
          {errors.saveConfirmed ? (
            <span id="save-error" role="alert" className="block text-destructive">
              {errors.saveConfirmed}
            </span>
          ) : null}
        </span>
      </label>
      {message ? (
        <p role="alert" className="font-bold text-destructive">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 rounded-control bg-primary px-5 font-bold text-primary-foreground"
      >
        {busy ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
