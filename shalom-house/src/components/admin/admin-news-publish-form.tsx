"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  validateAdminNewsPublishInput,
  type AdminNewsPublishFieldErrors,
} from "@/features/news/news.admin-validation";

export type AdminNewsPublishFormProps = {
  postId: string;
  expectedUpdatedAt: string;
};

const checkboxId = "admin-news-publication-confirmed";
const checkboxErrorId = "admin-news-publication-confirmed-error";

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

function getResponseError(value: unknown): string | null {
  return isRecord(value) && typeof value.error === "string" ? value.error : null;
}

function getPublicationConfirmedError(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.fieldErrors)) return null;
  return typeof value.fieldErrors.publicationConfirmed === "string"
    ? value.fieldErrors.publicationConfirmed
    : null;
}

export function AdminNewsPublishForm(props: AdminNewsPublishFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<AdminNewsPublishFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const formData = new FormData(event.currentTarget);
    const input = {
      expectedUpdatedAt: props.expectedUpdatedAt,
      publicationConfirmed: formData.get("publicationConfirmed") === "on",
    };
    const validation = validateAdminNewsPublishInput(input);
    setFormError(null);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      if (validation.formError === "invalid_version") {
        setFormError("게시 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/news/${encodeURIComponent(props.postId)}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(input),
        },
      );
      const responseBody = await readJsonResponse(response);
      if (
        response.status === 200 &&
        isRecord(responseBody) &&
        responseBody.ok === true &&
        typeof responseBody.id === "string" &&
        typeof responseBody.slug === "string" &&
        typeof responseBody.redirectTo === "string"
      ) {
        const fallback = `/admin/news/${props.postId}?published=1`;
        const redirectTo = responseBody.redirectTo.startsWith("/admin/news/")
          ? responseBody.redirectTo
          : fallback;
        router.push(redirectTo);
        router.refresh();
        return;
      }
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const error = getResponseError(responseBody);
      if (response.status === 400 && error === "validation") {
        const fieldError = getPublicationConfirmedError(responseBody);
        if (fieldError) setFieldErrors({ publicationConfirmed: fieldError });
        else setFormError("현재 게시물을 공개할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      } else if (response.status === 400 && error === "invalid_version") {
        setFormError("게시 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 404 && error === "not_found") {
        setFormError("게시할 게시물을 찾을 수 없습니다.");
      } else if (response.status === 409 && error === "edit_conflict") {
        setFormError("다른 관리자가 이 게시물을 먼저 변경했습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 409 && error === "not_publishable") {
        setFormError("현재 게시 상태에서는 공개할 수 없습니다.");
      } else {
        setFormError("현재 게시물을 공개할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const confirmationError = fieldErrors.publicationConfirmed;
  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting ? true : undefined} className="mt-5 max-w-3xl space-y-5">
      {formError ? <div role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">{formError}</div> : null}
      <div className="grid gap-2">
        <div className="flex items-start gap-3">
          <input id={checkboxId} name="publicationConfirmed" type="checkbox" aria-invalid={confirmationError ? true : undefined} aria-describedby={confirmationError ? checkboxErrorId : undefined} className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
          <label htmlFor={checkboxId} className="font-semibold">승인된 제목·요약·본문과 공개 범위를 최종 확인했으며 지금 즉시 홈페이지에 게시합니다.</label>
        </div>
        {confirmationError ? <p id={checkboxErrorId} className="text-small font-semibold text-danger">{confirmationError}</p> : null}
      </div>
      <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "게시 중…" : "지금 게시"}</button>
    </form>
  );
}
