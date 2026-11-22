"use client";
import { AdminNewsRichEditor } from "./admin-news-rich-editor";
import { newsBodyToDocument, type NewsBodyDocument } from "@/features/news/news.rich-text";
import { AdminDraftPdf, saveDraftPdf, type DraftPdf, type DraftPdfChange } from "./admin-draft-pdf";
import Link from "next/link";
import { AdminStickyFormActions } from "./admin-sticky-form-actions";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAdminFormDirtyGuard } from "@/lib/use-admin-unsaved-changes-guard";
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
      pdfEditable?: boolean;
      attachment?: DraftPdf | null;
      initialBody: readonly string[];
      bodyDocument?: NewsBodyDocument;
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
  ["slug", "공개 주소 식별자", "input"],
  ["title", "제목", "input"],
  ["summary", "요약", "textarea"],
  ["purpose", "목적", "textarea"],
  ["body", "본문", "textarea"],
  ["operationStatusLabel", "운영 상태 문구", "input"],
  ["sortOrder", "정렬 순서", "number"],
] as const;
export function AdminProgramDraftForm(props: AdminProgramDraftFormProps) {
  const router = useRouter();
  const { markDirty, navigateAfterSave } = useAdminFormDirtyGuard();
  const [errors, setErrors] = useState<AdminProgramDraftFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [editedDocument, setEditedDocument] = useState<unknown>();
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
  const [pdfChange, setPdfChange] = useState<DraftPdfChange>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfRecoveryHref, setPdfRecoveryHref] = useState<string | null>(null);
  const attachment = props.mode === "edit" ? props.attachment : null;
  const canEditPdf = props.mode === "create" || props.pdfEditable === true;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || pdfError || pdfRecoveryHref) return;
    const d = new FormData(e.currentTarget);
    const input = {
      category: d.get("category"),
      slug: d.get("slug"),
      title: d.get("title"),
      summary: d.get("summary"),
      purpose: d.get("purpose"),
      ...(editedDocument === undefined ? { body: initial.body } : { bodyDocument: editedDocument }),
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
        id?: string;
        updatedAt?: string;
      } | null;
      if (response.ok && body?.ok) {
        if (pdfChange) {
          const saved = await saveDraftPdf("programs", { id: body.id, updatedAt: body.updatedAt },
            pdfChange, attachment?.label ?? "첨부 PDF", d.get("draftPdfSafetyConfirmed") === "on");
          const id = body.id;
          const mediaHref = typeof id === "string" && /^[a-f0-9]{24}$/.test(id)
            ? `/admin/programs/${id}#program-media-heading`
            : "/admin/programs";
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
        navigateAfterSave(() => {
          router.push(
            body.redirectTo ??
              (props.mode === "create" ? "/admin/programs?created=1" : `/admin/programs/${props.programId}?updated=1`),
          );
          router.refresh();
        });
        return;
      }
      if (body?.fieldErrors) setErrors(body.fieldErrors);
      setFormError(
        body?.error === "edit_conflict"
          ? "다른 관리자가 먼저 수정했습니다. 상세 화면을 새로 확인해 주세요."
          : body?.error === "rich_text_required"
            ? "본문 서식을 보존하려면 최신 편집 화면에서 다시 시도해 주세요."
            : body?.error === "invalid_body_document"
              ? "저장된 본문 서식을 확인할 수 없어 변경을 저장하지 않았습니다."
              : "프로그램을 저장할 수 없습니다. 입력 내용을 확인해 주세요.",
      );
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
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
    <form onChangeCapture={markDirty} onSubmit={submit} aria-busy={busy || undefined} className="max-w-4xl space-y-6">
      <fieldset disabled={busy} className="min-w-0 space-y-6">
      {formError ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {formError}
        </p>
      ) : null}
      {fields.map(([name, label, kind]) => {
        const help =
          name === "slug"
            ? "공개 주소의 마지막 부분입니다. 영문 소문자, 숫자와 하이픈(-)으로 입력해 주세요. 예를 들어 daily-life를 입력하면 /life/programs/daily-life 주소로 연결됩니다."
            : name === "body"
              ? "본문에 제목·목록·링크를 추가할 수 있습니다."
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
          className:
            "min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
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
                    : name === "operationStatusLabel"
                      ? ADMIN_PROGRAM_OPERATION_STATUS_MAX_LENGTH
                      : undefined;
        return (
          <div key={name} className="grid gap-2 border-b border-border pb-6 last:border-b-0">
            <label id={`${id}-label`} htmlFor={name === "body" ? undefined : id} className="font-semibold">
              {label}
              {required ? <span className="ml-1 text-danger">*</span> : " (선택)"}
            </label>
            {name === "body" ? (
              <AdminNewsRichEditor
                bodyId={id}
                labelId={`${id}-label`}
                linkId="program-editor-link"
                maxLength={ADMIN_PROGRAM_BODY_MAX_LENGTH}
                initialDocument={props.mode === "edit"
                  ? props.bodyDocument ?? newsBodyToDocument(props.initialBody)
                  : newsBodyToDocument([])}
                disabled={busy}
                invalid={Boolean(error)}
                describedBy={common["aria-describedby"]}
                onChange={(document) => {
                  setEditedDocument(document);
                  markDirty();
                }}
              />
            ) : kind === "textarea" ? (
              <textarea {...common} required={required} maxLength={maxLength} rows={4} />
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
                {name === "slug" ? error.replaceAll("슬러그", "공개 주소 식별자") : error}
              </p>
            ) : null}
          </div>
        );
      })}
      <div className="grid gap-2">
        <div className="flex items-start gap-3 border-l-4 border-warning bg-warning-soft p-4">
          <input
            id="admin-program-safety"
            name="contentSafetyConfirmed"
            data-unsaved-ignore
            type="checkbox"
            required
            aria-invalid={errors.contentSafetyConfirmed ? true : undefined}
            aria-describedby={errors.contentSafetyConfirmed ? "admin-program-safety-error" : undefined}
            className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <label htmlFor="admin-program-safety" className="text-small leading-relaxed">
            거주인 개인정보, 장애·건강 정보, 내부 기록과 공개 권한이 없는 내용이 포함되지 않았음을 확인했습니다.
          </label>
        </div>
        {errors.contentSafetyConfirmed ? (
          <p id="admin-program-safety-error" className="text-small font-semibold text-danger">
            {errors.contentSafetyConfirmed}
          </p>
        ) : null}
      </div>
      {canEditPdf ? (
        <AdminDraftPdf existing={attachment} change={pdfChange} disabled={busy}
          error={pdfError} onError={setPdfError}
          onChange={(next) => { setPdfChange(next); markDirty(); }} />
      ) : attachment ? (
        <p className="break-words text-small">현재 첨부 PDF · {attachment.originalFileName}</p>
      ) : null}
      </fieldset>
      <AdminStickyFormActions>
        <button
          type="submit"
          disabled={busy || Boolean(pdfError)}
          className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 py-2 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "저장 중…" : props.mode === "create" ? "프로그램 초안 저장" : "변경 사항 저장"}
        </button>
        <Link
          href={props.mode === "create" ? "/admin/programs" : `/admin/programs/${props.programId}`}
          className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 py-2 font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          취소
        </Link>
      </AdminStickyFormActions>
    </form>
  );
}
