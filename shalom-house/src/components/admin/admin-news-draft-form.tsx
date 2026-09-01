"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  ADMIN_NEWS_BODY_MAX_LENGTH,
  ADMIN_NEWS_SLUG_MAX_LENGTH,
  ADMIN_NEWS_SUMMARY_MAX_LENGTH,
  ADMIN_NEWS_TITLE_MAX_LENGTH,
  validateAdminNewsDraftInput,
  type AdminNewsDraftField,
  type AdminNewsDraftFieldErrors,
} from "@/features/news/news.admin-validation";
import { PUBLIC_NEWS_RESERVED_SLUGS } from "@/features/news/news.types";

const fieldErrorIds: Record<AdminNewsDraftField, string> = {
  category: "admin-news-category-error",
  title: "admin-news-title-error",
  slug: "admin-news-slug-error",
  summary: "admin-news-summary-error",
  body: "admin-news-body-error",
  contentSafetyConfirmed: "admin-news-content-safety-error",
};

function FieldError({ field, errors }: { field: AdminNewsDraftField; errors: AdminNewsDraftFieldErrors }) {
  return errors[field] ? (
    <p id={fieldErrorIds[field]} className="text-small font-semibold text-danger">
      {errors[field]}
    </p>
  ) : null;
}

function describedBy(
  field: AdminNewsDraftField,
  errors: AdminNewsDraftFieldErrors,
  helpId?: string,
): string | undefined {
  return [helpId, errors[field] ? fieldErrorIds[field] : undefined].filter(Boolean).join(" ") || undefined;
}

export type AdminNewsDraftFormInitialValues = {
  category: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
};

export type AdminNewsDraftFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      postId: string;
      expectedUpdatedAt: string;
      initialValues: AdminNewsDraftFormInitialValues;
    };

async function readJsonResponse(response: Response): Promise<unknown | null> {
  const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") return null;

  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResponseError(value: unknown): string | null {
  return isRecord(value) && typeof value.error === "string" ? value.error : null;
}

function getFieldErrors(value: unknown): AdminNewsDraftFieldErrors | null {
  if (!isRecord(value) || !isRecord(value.fieldErrors)) return null;
  const errors: AdminNewsDraftFieldErrors = {};
  for (const field of Object.keys(fieldErrorIds) as AdminNewsDraftField[]) {
    if (typeof value.fieldErrors[field] === "string") {
      errors[field] = value.fieldErrors[field];
    }
  }
  return errors;
}

function getSafeRedirect(value: unknown): string | null {
  if (!isRecord(value) || typeof value.redirectTo !== "string") return null;
  return /^\/admin\/news(?:[/?]|$)/.test(value.redirectTo) ? value.redirectTo : null;
}

export function AdminNewsDraftForm(props: AdminNewsDraftFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<AdminNewsDraftFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      category: formData.get("category"),
      title: formData.get("title"),
      slug: formData.get("slug"),
      summary: formData.get("summary"),
      body: formData.get("body"),
      contentSafetyConfirmed: formData.get("contentSafetyConfirmed") === "on",
      ...(props.mode === "edit" ? { expectedUpdatedAt: props.expectedUpdatedAt } : {}),
    };
    const validation = validateAdminNewsDraftInput(input);

    setFormError(null);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch(
        props.mode === "create" ? "/api/admin/news" : `/api/admin/news/${encodeURIComponent(props.postId)}`,
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
      const responseBody = await readJsonResponse(response);
      const expectedSuccessStatus = props.mode === "create" ? 201 : 200;
      if (response.status === expectedSuccessStatus && isRecord(responseBody) && responseBody.ok === true) {
        const fallback = props.mode === "create" ? "/admin/news?created=1" : `/admin/news/${props.postId}?updated=1`;
        router.push(getSafeRedirect(responseBody) ?? fallback);
        router.refresh();
        return;
      }
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const error = getResponseError(responseBody);
      const serverFieldErrors = getFieldErrors(responseBody);
      if ((response.status === 400 || response.status === 409) && serverFieldErrors) {
        setFieldErrors(serverFieldErrors);
      } else if (props.mode === "edit" && response.status === 404 && error === "not_found") {
        setFormError("수정할 게시물을 찾을 수 없습니다.");
      } else if (props.mode === "edit" && response.status === 409 && error === "edit_conflict") {
        setFormError(
          "다른 관리자가 이 게시물을 먼저 수정했습니다. 입력 내용을 복사한 뒤 상세 화면을 새로 확인해 주세요.",
        );
      } else if (props.mode === "edit" && response.status === 409 && error === "not_editable") {
        setFormError("현재 게시 상태에서는 내용을 수정할 수 없습니다.");
      } else {
        setFormError("현재 초안을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const controlClass =
    "w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting ? true : undefined} className="max-w-3xl space-y-6">
      {formError ? (
        <div role="alert" className="rounded-control border border-border-strong bg-surface p-4 text-danger">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="admin-news-category" className="font-semibold">
          분류
        </label>
        <select
          id="admin-news-category"
          name="category"
          required
          defaultValue={props.mode === "edit" ? props.initialValues.category : ""}
          aria-invalid={fieldErrors.category ? true : undefined}
          aria-describedby={describedBy("category", fieldErrors)}
          className={`min-h-11 ${controlClass}`}
        >
          <option value="">소식 분류 선택</option>
          <option value="notice">공지사항</option>
          <option value="activity">활동 소식</option>
        </select>
        <FieldError field="category" errors={fieldErrors} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="admin-news-title" className="font-semibold">
          제목
        </label>
        <input
          id="admin-news-title"
          name="title"
          type="text"
          required
          defaultValue={props.mode === "edit" ? props.initialValues.title : ""}
          maxLength={ADMIN_NEWS_TITLE_MAX_LENGTH}
          autoComplete="off"
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={describedBy("title", fieldErrors)}
          className={`min-h-11 ${controlClass}`}
        />
        <FieldError field="title" errors={fieldErrors} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="admin-news-slug" className="font-semibold">
          슬러그
        </label>
        <input
          id="admin-news-slug"
          name="slug"
          type="text"
          required
          defaultValue={props.mode === "edit" ? props.initialValues.slug : ""}
          maxLength={ADMIN_NEWS_SLUG_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={fieldErrors.slug ? true : undefined}
          aria-describedby={describedBy("slug", fieldErrors, "admin-news-slug-help")}
          className={`min-h-11 ${controlClass}`}
        />
        <p id="admin-news-slug-help" className="text-small text-muted-foreground">
          영문 소문자, 숫자와 하이픈만 사용할 수 있습니다.
          <br />
          공개 주소는 /news/입력한-슬러그 형태가 됩니다.
          <br />
          {PUBLIC_NEWS_RESERVED_SLUGS.join(", ")}는 분류 페이지 주소이므로 사용할 수 없습니다.
        </p>
        <FieldError field="slug" errors={fieldErrors} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="admin-news-summary" className="font-semibold">
          요약
        </label>
        <textarea
          id="admin-news-summary"
          name="summary"
          required
          defaultValue={props.mode === "edit" ? props.initialValues.summary : ""}
          maxLength={ADMIN_NEWS_SUMMARY_MAX_LENGTH}
          rows={4}
          aria-invalid={fieldErrors.summary ? true : undefined}
          aria-describedby={describedBy("summary", fieldErrors, "admin-news-summary-help")}
          className={controlClass}
        />
        <p id="admin-news-summary-help" className="text-small text-muted-foreground">
          뉴스 목록과 검색 설명에 사용될 짧은 내용을 입력합니다.
        </p>
        <FieldError field="summary" errors={fieldErrors} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="admin-news-body" className="font-semibold">
          본문
        </label>
        <textarea
          id="admin-news-body"
          name="body"
          required
          defaultValue={props.mode === "edit" ? props.initialValues.body : ""}
          maxLength={ADMIN_NEWS_BODY_MAX_LENGTH}
          rows={18}
          aria-invalid={fieldErrors.body ? true : undefined}
          aria-describedby={describedBy("body", fieldErrors, "admin-news-body-help")}
          className={controlClass}
        />
        <p id="admin-news-body-help" className="text-small text-muted-foreground">
          빈 줄로 문단을 구분합니다.
          <br />
          HTML과 Markdown이 아닌 일반 텍스트로 저장됩니다.
        </p>
        <FieldError field="body" errors={fieldErrors} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-start gap-3 rounded-control border border-border bg-surface p-4">
          <input
            id="admin-news-content-safety"
            name="contentSafetyConfirmed"
            type="checkbox"
            required
            aria-invalid={fieldErrors.contentSafetyConfirmed ? true : undefined}
            aria-describedby={describedBy("contentSafetyConfirmed", fieldErrors)}
            className="mt-1 size-5 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <label htmlFor="admin-news-content-safety" className="text-small leading-relaxed">
            거주인·직원·보호자 등의 개인정보, 민감정보와 공개 금지 정보가 포함되지 않았으며 홈페이지 검토용으로 저장해도
            되는 내용임을 확인했습니다.
          </label>
        </div>
        <FieldError field="contentSafetyConfirmed" errors={fieldErrors} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {isSubmitting ? "저장 중…" : props.mode === "create" ? "초안 저장" : "변경 사항 저장"}
        </button>
        <Link
          href={props.mode === "create" ? "/admin/news" : `/admin/news/${props.postId}`}
          className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
