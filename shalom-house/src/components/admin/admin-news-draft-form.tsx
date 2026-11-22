"use client";

import { AdminDraftPdf, saveDraftPdf, type DraftPdf, type DraftPdfChange } from "./admin-draft-pdf";
import Link from "next/link";
import { AdminNewsRichEditor } from "./admin-news-rich-editor";
import { newsBodyToDocument, type NewsBodyDocument } from "@/features/news/news.rich-text";
import { AdminStickyFormActions } from "./admin-sticky-form-actions";
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
import { useAdminFormDirtyGuard } from "@/lib/use-admin-unsaved-changes-guard";
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
      {field === "slug" ? errors[field]?.replaceAll("슬러그", "공개 주소 식별자") : errors[field]}
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
  | { mode: "create"; simpleManagement?: boolean }
  | {
      mode: "edit";
      simpleManagement?: boolean;
      postId: string;
      expectedUpdatedAt: string;
      pdfEditable?: boolean;
      attachment?: DraftPdf | null;
      initialValues: AdminNewsDraftFormInitialValues;
      initialBody?: readonly string[];
      bodyDocument?: NewsBodyDocument;
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
  const { markDirty, navigateAfterSave } = useAdminFormDirtyGuard();
  const [fieldErrors, setFieldErrors] = useState<AdminNewsDraftFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bodyDocument, setBodyDocument] = useState<unknown>(undefined);

  const [pdfChange, setPdfChange] = useState<DraftPdfChange>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfRecoveryHref, setPdfRecoveryHref] = useState<string | null>(null);
  const attachment = props.mode === "edit" ? props.attachment : null;
  const canEditPdf = props.mode === "create" || props.pdfEditable === true;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || pdfError || pdfRecoveryHref) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      publishImmediately: !pdfChange && props.mode === "create" && props.simpleManagement === true && (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "publish",
      category: formData.get("category"),
      title: formData.get("title"),
      ...(!props.simpleManagement ? {
        slug: formData.get("slug"),
        summary: formData.get("summary"),
      } : {}),
      body: props.simpleManagement ? props.mode === "edit" ? props.initialValues.body : "" : formData.get("body"),
      ...(bodyDocument !== undefined && props.simpleManagement ? { bodyDocument } : {}),
      contentSafetyConfirmed: formData.get("contentSafetyConfirmed") === "on",
      ...(props.mode === "edit" ? { expectedUpdatedAt: props.expectedUpdatedAt } : {}),
    };
    const validation = validateAdminNewsDraftInput(input, props.simpleManagement === true);

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
        if (pdfChange) {
          const saved = await saveDraftPdf("news", { id: responseBody.id, updatedAt: responseBody.updatedAt },
            pdfChange, attachment?.label ?? "첨부 PDF", formData.get("draftPdfSafetyConfirmed") === "on");
          const id = responseBody.id;
          const mediaHref = typeof id === "string" && /^[a-f0-9]{24}$/.test(id)
            ? `/admin/news/${id}#news-media-heading`
            : "/admin/news";
          if (!saved) {
            setPdfRecoveryHref(mediaHref);
            return;
          }
          navigateAfterSave(() => {
            router.push(mediaHref);
            router.refresh();
          });
          return;
        }
        const fallback = props.mode === "create" ? "/admin/news?created=1" : `/admin/news/${props.postId}?updated=1`;
        navigateAfterSave(() => {
          router.push(getSafeRedirect(responseBody) ?? fallback);
          router.refresh();
        });
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
      } else if (response.status === 409 && error === "rich_text_required") {
        setFormError("본문 서식을 보존하려면 최신 편집 화면에서 수정해 주세요. 입력 내용을 복사한 뒤 다시 확인해 주세요.");
      } else if (response.status === 409 && error === "invalid_body_document") {
        setFormError("저장된 본문 서식을 확인할 수 없어 수정하지 않았습니다. 관리자에게 확인해 주세요.");
      } else if (props.mode === "edit" && response.status === 409 && error === "not_editable") {
        setFormError("현재 게시 상태에서는 내용을 수정할 수 없습니다.");
      } else {
        setFormError("현재 게시물을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const controlClass =
    "w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

  if (pdfRecoveryHref) {
    return (
      <div className="space-y-3">
        <p role="alert" className="font-semibold text-danger">
          본문은 저장했습니다. PDF 처리 결과를 확인하지 못했습니다. 미디어 관리에서 현재 첨부를 확인한 뒤 필요한 경우 다시 시도해 주세요.
        </p>
        <button type="button" className="min-h-11 font-semibold text-primary underline focus-visible:outline-2 focus-visible:outline-focus-ring"
          onClick={() => navigateAfterSave(() => { router.push(pdfRecoveryHref); router.refresh(); })}>
          저장된 글의 미디어 관리로 이동
        </button>
      </div>
    );
  }

  return (
    <form onChangeCapture={markDirty} onSubmit={handleSubmit} aria-busy={isSubmitting ? true : undefined} className="max-w-4xl space-y-6">
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
      {formError ? (
        <div role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-2 border-b border-border pb-6">
        <label htmlFor="admin-news-category" className="font-semibold">
          분류 <span className="text-danger">*</span>
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

      <div className="grid gap-2 border-b border-border pb-6">
        <label htmlFor="admin-news-title" className="font-semibold">
          제목 <span className="text-danger">*</span>
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

      {!props.simpleManagement ? <>
      <div className="grid gap-2 border-b border-border pb-6">
        <label htmlFor="admin-news-slug" className="font-semibold">
          공개 주소 식별자 <span className="text-danger">*</span>
        </label>
        <input
          id="admin-news-slug"
          name="slug"
          type="text"
          required
          defaultValue={props.mode === "edit" ? props.initialValues.slug : ""}
          maxLength={ADMIN_NEWS_SLUG_MAX_LENGTH}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={fieldErrors.slug ? true : undefined}
          aria-describedby={describedBy("slug", fieldErrors, "admin-news-slug-help")}
          className={`min-h-11 ${controlClass}`}
        />
        <p id="admin-news-slug-help" className="text-small text-muted-foreground">
          공개 주소의 마지막 부분입니다. 영문 소문자, 숫자와 하이픈(-)으로 입력해 주세요.
          <br />
          예를 들어 house-news를 입력하면 /news/house-news 주소로 연결됩니다.
          <br />
          {PUBLIC_NEWS_RESERVED_SLUGS.join(", ")}는 분류 페이지 주소이므로 사용할 수 없습니다.
        </p>
        <FieldError field="slug" errors={fieldErrors} />
      </div>

      <div className="grid gap-2 border-b border-border pb-6">
        <label htmlFor="admin-news-summary" className="font-semibold">
          요약 <span className="text-danger">*</span>
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
          소식 목록과 검색 결과에 표시할 짧은 요약을 입력합니다.
        </p>
        <FieldError field="summary" errors={fieldErrors} />
      </div>
      </> : null}

      <div className="grid gap-2 border-b border-border pb-6">
        <label id="admin-news-body-label" htmlFor={props.simpleManagement ? undefined : "admin-news-body"} className="font-semibold">
          본문 <span className="text-danger">*</span>
        </label>
        {props.simpleManagement ? <AdminNewsRichEditor
          key={props.mode === "edit" ? props.expectedUpdatedAt : "new"}
          initialDocument={props.mode === "edit" ? props.bodyDocument ?? newsBodyToDocument(props.initialBody ?? [props.initialValues.body]) : newsBodyToDocument([])}
          disabled={isSubmitting} invalid={Boolean(fieldErrors.body)} describedBy={describedBy("body", fieldErrors, "admin-news-body-help")}
          onChange={(value) => { setBodyDocument(value); markDirty(); }}
        /> : <textarea
          id="admin-news-body"
          name="body"
          required
          defaultValue={props.mode === "edit" ? props.initialValues.body : ""}
          maxLength={ADMIN_NEWS_BODY_MAX_LENGTH}
          rows={18}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.body ? true : undefined}
          aria-describedby={describedBy("body", fieldErrors, "admin-news-body-help")}
          className={controlClass}
        />}
        <p id="admin-news-body-help" className="text-small text-muted-foreground">
          {props.simpleManagement ? "본문에 문단·제목·목록·링크 서식을 사용할 수 있습니다." : "빈 줄로 문단을 구분하며 HTML과 Markdown이 아닌 일반 텍스트로 저장됩니다."}
          {props.simpleManagement ? <><br />목록과 검색에 표시할 요약은 본문에서 자동 생성됩니다. 기존 글은 본문을 변경할 때만 요약이 갱신됩니다.</> : null}
        </p>
        <FieldError field="body" errors={fieldErrors} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-start gap-3 border-l-4 border-warning bg-warning-soft p-4">
          <input
            id="admin-news-content-safety"
            name="contentSafetyConfirmed"
            data-unsaved-ignore
            type="checkbox"
            required
            aria-invalid={fieldErrors.contentSafetyConfirmed ? true : undefined}
            aria-describedby={describedBy("contentSafetyConfirmed", fieldErrors)}
            className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <label htmlFor="admin-news-content-safety" className="text-small leading-relaxed">
            거주인·직원·보호자 등의 개인정보, 민감정보와 공개 금지 정보가 포함되지 않았으며 홈페이지에 공개해도
            되는 내용임을 확인했습니다.
          </label>
        </div>
        <FieldError field="contentSafetyConfirmed" errors={fieldErrors} />
      </div>

      {canEditPdf ? (
        <AdminDraftPdf existing={attachment} change={pdfChange} disabled={isSubmitting}
          error={pdfError} onError={setPdfError}
          onChange={(next) => { setPdfChange(next); markDirty(); }} />
      ) : attachment ? (
        <p className="break-words text-small">현재 첨부 PDF · {attachment.originalFileName}</p>
      ) : null}
      {props.mode === "create" && props.simpleManagement && pdfChange ? (
        <p className="text-small text-muted-foreground">PDF를 첨부하려면 임시저장 후 상세 화면에서 게시해 주세요.</p>
      ) : null}
      </fieldset>
      <AdminStickyFormActions>
        <button
          type="submit"
          disabled={isSubmitting || Boolean(pdfError)}
          className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 py-2 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "저장 중…" : props.mode === "create" ? "임시저장" : "변경 사항 저장"}
        </button>
        {props.mode === "create" && props.simpleManagement ? (
          <button type="submit" value="publish" disabled={isSubmitting || Boolean(pdfChange) || Boolean(pdfError)} className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 py-2 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-60">
            {isSubmitting ? "저장 중…" : "게시하기"}
          </button>
        ) : null}
        <Link
          href={props.mode === "create" ? "/admin/news" : `/admin/news/${props.postId}`}
          className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 py-2 font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          취소
        </Link>
      </AdminStickyFormActions>
    </form>
  );
}
