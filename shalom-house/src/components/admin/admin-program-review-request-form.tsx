"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  validateAdminProgramReviewRequestInput,
  type AdminProgramReviewRequestFieldErrors,
} from "@/features/programs/program.admin-validation";

export type AdminProgramReviewRequestFormProps = {
  postId: string;
  expectedUpdatedAt: string;
};

const checkboxId = "admin-program-review-readiness";
const checkboxErrorId = "admin-program-review-readiness-error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonResponse(response: Response): Promise<unknown | null> {
  const mediaType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
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

function getReviewReadinessError(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.fieldErrors)) return null;
  return typeof value.fieldErrors.reviewReadinessConfirmed === "string"
    ? value.fieldErrors.reviewReadinessConfirmed
    : null;
}

function getSafeRedirect(value: unknown): string | null {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    typeof value.redirectTo !== "string"
  ) {
    return null;
  }
  return value.redirectTo.startsWith("/admin/programs/") ? value.redirectTo : null;
}

export function AdminProgramReviewRequestForm(
  props: AdminProgramReviewRequestFormProps,
) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] =
    useState<AdminProgramReviewRequestFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const input = {
      expectedUpdatedAt: props.expectedUpdatedAt,
      reviewReadinessConfirmed:
        formData.get("reviewReadinessConfirmed") === "on",
    };
    const validation = validateAdminProgramReviewRequestInput(input);

    setFormError(null);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      if (validation.formError === "invalid_version") {
        setFormError(
          "검토 요청 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.",
        );
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/programs/${encodeURIComponent(props.postId)}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(input),
        },
      );
      const responseBody = await readJsonResponse(response);
      if (
        response.status === 200 &&
        isRecord(responseBody) &&
        responseBody.ok === true
      ) {
        const fallback = `/admin/programs/${props.postId}?reviewRequested=1`;
        router.push(getSafeRedirect(responseBody) ?? fallback);
        router.refresh();
        return;
      }
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const error = getResponseError(responseBody);
      if (response.status === 400 && error === "validation") {
        const fieldError = getReviewReadinessError(responseBody);
        if (fieldError) {
          setFieldErrors({ reviewReadinessConfirmed: fieldError });
        } else {
          setFormError("현재 검토 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        }
      } else if (response.status === 400 && error === "invalid_version") {
        setFormError("검토 요청 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 404 && error === "not_found") {
        setFormError("검토를 요청할 프로그램을 찾을 수 없습니다.");
      } else if (response.status === 409 && error === "edit_conflict") {
        setFormError("다른 관리자가 이 프로그램을 먼저 수정했습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 409 && error === "not_requestable") {
        setFormError("현재 게시 상태에서는 검토를 요청할 수 없습니다.");
      } else {
        setFormError("현재 검토 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const readinessError = fieldErrors.reviewReadinessConfirmed;

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isSubmitting ? true : undefined}
      className="mt-5 max-w-3xl space-y-5"
    >
      {formError ? (
        <div role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-2">
        <div className="flex items-start gap-3">
          <input
            id={checkboxId}
            name="reviewReadinessConfirmed"
            type="checkbox"
            aria-invalid={readinessError ? true : undefined}
            aria-describedby={readinessError ? checkboxErrorId : undefined}
            className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <label htmlFor={checkboxId} className="font-semibold">
            제목·요약·본문의 사실관계와 개인정보·민감정보·공개 금지 정보 포함 여부를 다시 확인했으며 검토를 요청합니다.
          </label>
        </div>
        {readinessError ? (
          <p id={checkboxErrorId} className="text-small font-semibold text-danger">
            {readinessError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "요청 중…" : "검토 요청"}
      </button>
    </form>
  );
}
