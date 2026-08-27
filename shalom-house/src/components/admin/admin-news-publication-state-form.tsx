"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  isAdminNewsPublicationAction,
  validateAdminNewsPublicationStateInput,
  type AdminNewsPublicationStateFieldErrors,
} from "@/features/news/news.admin-validation";

export type AdminNewsPublicationStateFormProps = {
  postId: string;
  expectedUpdatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonResponse(response: Response): Promise<unknown | null> {
  const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") return null;
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export function AdminNewsPublicationStateForm(
  props: AdminNewsPublicationStateFormProps,
) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<AdminNewsPublicationStateFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const formData = new FormData(event.currentTarget);
    const input = {
      expectedUpdatedAt: props.expectedUpdatedAt,
      action: formData.get("action"),
      transitionConfirmed: formData.get("transitionConfirmed") === "on",
    };
    const validation = validateAdminNewsPublicationStateInput(input);
    setFormError(null);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      if (validation.formError === "invalid_version") {
        setFormError("게시 상태 변경 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
      }
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/news/${encodeURIComponent(props.postId)}/publication`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(input),
        },
      );
      const body = await readJsonResponse(response);
      if (
        response.status === 200 &&
        isRecord(body) &&
        body.ok === true &&
        typeof body.id === "string" &&
        typeof body.slug === "string" &&
        isAdminNewsPublicationAction(body.action) &&
        typeof body.redirectTo === "string"
      ) {
        const fallback = `/admin/news/${props.postId}?publication=${body.action === "unpublish" ? "unpublished" : "archived"}`;
        router.push(body.redirectTo.startsWith("/admin/news/") ? body.redirectTo : fallback);
        router.refresh();
        return;
      }
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const error = isRecord(body) && typeof body.error === "string" ? body.error : null;
      if (response.status === 400 && error === "validation" && isRecord(body) && isRecord(body.fieldErrors)) {
        setFieldErrors({
          ...(typeof body.fieldErrors.action === "string" ? { action: body.fieldErrors.action } : {}),
          ...(typeof body.fieldErrors.transitionConfirmed === "string" ? { transitionConfirmed: body.fieldErrors.transitionConfirmed } : {}),
        });
      } else if (response.status === 400 && error === "invalid_version") {
        setFormError("게시 상태 변경 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 404 && error === "not_found") {
        setFormError("상태를 변경할 게시물을 찾을 수 없습니다.");
      } else if (response.status === 409 && error === "edit_conflict") {
        setFormError("다른 관리자가 이 게시물을 먼저 변경했습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 409 && error === "not_manageable") {
        setFormError("현재 게시 상태에서는 게시 중단 또는 보관을 처리할 수 없습니다.");
      } else {
        setFormError("현재 게시 상태를 변경할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting ? true : undefined} className="mt-5 max-w-3xl space-y-5">
      {formError ? <div role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">{formError}</div> : null}
      <fieldset aria-describedby={fieldErrors.action ? "admin-news-publication-action-error" : undefined} className="space-y-4">
        <legend className="font-bold">변경할 상태 선택</legend>
        <div className="flex items-start gap-3">
          <input id="admin-news-publication-action-unpublish" name="action" value="unpublish" type="radio" className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
          <label htmlFor="admin-news-publication-action-unpublish"><span className="font-semibold">게시 중단</span><span className="mt-1 block text-small text-muted-foreground">홈페이지 공개를 즉시 종료하고 승인 완료·미게시 상태로 되돌립니다. 이후 다시 게시할 수 있습니다.</span></label>
        </div>
        <div className="flex items-start gap-3">
          <input id="admin-news-publication-action-archive" name="action" value="archive" type="radio" className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
          <label htmlFor="admin-news-publication-action-archive"><span className="font-semibold">보관</span><span className="mt-1 block text-small text-muted-foreground">홈페이지 공개를 즉시 종료하고 보관 상태로 전환합니다. 현재는 보관 해제와 재게시를 지원하지 않습니다.</span></label>
        </div>
        {fieldErrors.action ? <p id="admin-news-publication-action-error" className="text-small font-semibold text-danger">{fieldErrors.action}</p> : null}
      </fieldset>
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input id="admin-news-publication-transition-confirmed" name="transitionConfirmed" type="checkbox" aria-invalid={fieldErrors.transitionConfirmed ? true : undefined} aria-describedby={fieldErrors.transitionConfirmed ? "admin-news-publication-transition-confirmed-error" : undefined} className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
          <label htmlFor="admin-news-publication-transition-confirmed" className="font-semibold">선택한 상태 변경과 공개 종료 결과를 확인했습니다.</label>
        </div>
        {fieldErrors.transitionConfirmed ? <p id="admin-news-publication-transition-confirmed-error" className="text-small font-semibold text-danger">{fieldErrors.transitionConfirmed}</p> : null}
      </div>
      <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "처리 중…" : "게시 상태 변경"}</button>
    </form>
  );
}
