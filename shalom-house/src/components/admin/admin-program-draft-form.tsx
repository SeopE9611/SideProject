"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ADMIN_PROGRAM_BODY_MAX_LENGTH,
  ADMIN_PROGRAM_CATEGORY_MAX_LENGTH,
  ADMIN_PROGRAM_OPERATION_STATUS_MAX_LENGTH,
  ADMIN_PROGRAM_PURPOSE_MAX_LENGTH,
  ADMIN_PROGRAM_SLUG_MAX_LENGTH,
  ADMIN_PROGRAM_SORT_ORDER_MAX,
  ADMIN_PROGRAM_SORT_ORDER_MIN,
  ADMIN_PROGRAM_SUMMARY_MAX_LENGTH,
  ADMIN_PROGRAM_TITLE_MAX_LENGTH,
  validateAdminProgramDraftInput,
  type AdminProgramDraftFieldErrors,
} from "@/features/programs/program.admin-validation";
export type AdminProgramDraftFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      programId: string;
      expectedUpdatedAt: string;
      initialValue: {
        category: string;
        slug: string;
        title: string;
        summary: string;
        purpose: string;
        body: string;
        operationStatusLabel: string;
        sortOrder: number;
      };
    };
const fields = [
  ["category", "분류", "input"],
  ["slug", "슬러그", "input"],
  ["title", "제목", "input"],
  ["summary", "요약", "textarea"],
  ["purpose", "목적", "textarea"],
  ["body", "본문", "textarea"],
  ["operationStatusLabel", "운영 상태 문구", "input"],
  ["sortOrder", "정렬 순서", "number"],
] as const;
export function AdminProgramDraftForm(props: AdminProgramDraftFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<AdminProgramDraftFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initial =
    props.mode === "edit"
      ? props.initialValue
      : {
          category: "",
          slug: "",
          title: "",
          summary: "",
          purpose: "",
          body: "",
          operationStatusLabel: "",
          sortOrder: 100,
        };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const d = new FormData(e.currentTarget);
    const input = {
      category: d.get("category"),
      slug: d.get("slug"),
      title: d.get("title"),
      summary: d.get("summary"),
      purpose: d.get("purpose"),
      body: d.get("body"),
      operationStatusLabel: d.get("operationStatusLabel"),
      sortOrder: d.get("sortOrder"),
      contentSafetyConfirmed: d.get("contentSafetyConfirmed") === "on",
      ...(props.mode === "edit" ? { expectedUpdatedAt: props.expectedUpdatedAt } : {}),
    };
    const checked = validateAdminProgramDraftInput(input);
    if (!checked.ok) {
      setErrors(checked.fieldErrors);
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    try {
      const response = await fetch(
        props.mode === "create" ? "/api/admin/programs" : `/api/admin/programs/${encodeURIComponent(props.programId)}`,
        {
          method: props.mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(input),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: AdminProgramDraftFieldErrors;
        redirectTo?: string;
      } | null;
      if (response.ok && body?.ok) {
        router.push(
          body.redirectTo ??
            (props.mode === "create" ? "/admin/programs?created=1" : `/admin/programs/${props.programId}?updated=1`),
        );
        router.refresh();
        return;
      }
      if (body?.fieldErrors) setErrors(body.fieldErrors);
      setFormError(
        body?.error === "edit_conflict"
          ? "다른 관리자가 먼저 수정했습니다. 상세 화면을 새로 확인해 주세요."
          : "프로그램을 저장할 수 없습니다. 입력 내용을 확인해 주세요.",
      );
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy || undefined} className="max-w-4xl space-y-6">
      {formError ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {formError}
        </p>
      ) : null}
      {fields.map(([name, label, kind]) => {
        const help =
          name === "slug"
            ? "영문 소문자, 숫자와 하이픈만 사용할 수 있습니다. 공개 주소는 /life/programs/입력한-슬러그 형태가 됩니다."
            : name === "body"
              ? "빈 줄을 기준으로 문단을 구분합니다."
              : name === "operationStatusLabel"
                ? "공개 화면에 표시할 공식 상태 문구가 있을 때만 입력합니다."
                : name === "sortOrder"
                  ? "작은 숫자의 프로그램이 먼저 표시됩니다."
                  : null;
        const id = `admin-program-${name}`;
        const error = errors[name];
        const common = {
          id,
          name,
          defaultValue: String(initial[name]),
          "aria-invalid": error ? true : undefined,
          "aria-describedby": `${help ? `${id}-help ` : ""}${error ? `${id}-error` : ""}`.trim() || undefined,
          className: "min-h-12 rounded-control border border-border-strong bg-background px-3 py-2",
        };
        const required = name !== "operationStatusLabel";
        const maxLength =
          name === "category"
            ? ADMIN_PROGRAM_CATEGORY_MAX_LENGTH
            : name === "slug"
              ? ADMIN_PROGRAM_SLUG_MAX_LENGTH
              : name === "title"
                ? ADMIN_PROGRAM_TITLE_MAX_LENGTH
                : name === "summary"
                  ? ADMIN_PROGRAM_SUMMARY_MAX_LENGTH
                  : name === "purpose"
                    ? ADMIN_PROGRAM_PURPOSE_MAX_LENGTH
                    : name === "body"
                      ? ADMIN_PROGRAM_BODY_MAX_LENGTH
                      : name === "operationStatusLabel"
                        ? ADMIN_PROGRAM_OPERATION_STATUS_MAX_LENGTH
                        : undefined;
        return (
          <div key={name} className="grid gap-2 border-b border-border pb-6 last:border-b-0">
            <label htmlFor={id} className="font-semibold">
              {label}
              {required ? <span className="ml-1 text-danger">*</span> : " (선택)"}
            </label>
            {kind === "textarea" ? (
              <textarea {...common} required={required} maxLength={maxLength} rows={name === "body" ? 14 : 4} />
            ) : (
              <input
                {...common}
                type={kind === "number" ? "number" : "text"}
                required={required}
                maxLength={maxLength}
                pattern={name === "slug" ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined}
                autoCapitalize={name === "slug" ? "none" : undefined}
                spellCheck={name === "slug" ? false : undefined}
                min={kind === "number" ? ADMIN_PROGRAM_SORT_ORDER_MIN : undefined}
                max={kind === "number" ? ADMIN_PROGRAM_SORT_ORDER_MAX : undefined}
                step={kind === "number" ? 1 : undefined}
              />
            )}{" "}
            {help ? (
              <p id={`${id}-help`} className="text-small text-muted-foreground">
                {help}
              </p>
            ) : null}
            {error ? (
              <p id={`${id}-error`} className="text-small font-semibold text-danger">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
      <div>
        <div className="flex items-start gap-3">
          <input
            id="admin-program-safety"
            name="contentSafetyConfirmed"
            type="checkbox"
            required
            aria-invalid={errors.contentSafetyConfirmed ? true : undefined}
            aria-describedby={errors.contentSafetyConfirmed ? "admin-program-safety-error" : undefined}
          />
          <label htmlFor="admin-program-safety">
            거주인 개인정보, 장애·건강 정보, 내부 기록과 공개 권한이 없는 내용이 포함되지 않았음을 확인했습니다.
          </label>
        </div>
        {errors.contentSafetyConfirmed ? (
          <p id="admin-program-safety-error" className="text-small font-semibold text-danger">
            {errors.contentSafetyConfirmed}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-control bg-primary px-6 py-2 font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "저장 중…" : props.mode === "create" ? "프로그램 초안 저장" : "변경 사항 저장"}
        </button>
        <Link
          href={props.mode === "create" ? "/admin/programs" : `/admin/programs/${props.programId}`}
          className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 py-2 font-bold text-primary"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
