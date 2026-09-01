"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  isAdminProgramReviewDecision,
  validateAdminProgramReviewDecisionInput,
  type AdminProgramReviewDecisionFieldErrors,
} from "@/features/programs/program.admin-validation";

export type AdminProgramReviewDecisionFormProps = {
  postId: string;
  expectedUpdatedAt: string;
};

const decisionErrorId = "admin-program-review-decision-error";
const confirmedErrorId = "admin-program-review-decision-confirmed-error";

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

function getFieldErrors(value: unknown): AdminProgramReviewDecisionFieldErrors | null {
  if (!isRecord(value) || !isRecord(value.fieldErrors)) return null;
  const errors: AdminProgramReviewDecisionFieldErrors = {};
  if (typeof value.fieldErrors.decision === "string") errors.decision = value.fieldErrors.decision;
  if (typeof value.fieldErrors.decisionConfirmed === "string") {
    errors.decisionConfirmed = value.fieldErrors.decisionConfirmed;
  }
  return errors;
}

export function AdminProgramReviewDecisionForm(props: AdminProgramReviewDecisionFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<AdminProgramReviewDecisionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const formData = new FormData(event.currentTarget);
    const input = {
      expectedUpdatedAt: props.expectedUpdatedAt,
      decision: formData.get("decision"),
      decisionConfirmed: formData.get("decisionConfirmed") === "on",
    };
    const validation = validateAdminProgramReviewDecisionInput(input);
    setFormError(null);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      if (validation.formError === "invalid_version") {
        setFormError("검토 결과 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/programs/${encodeURIComponent(props.postId)}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      const responseBody = await readJsonResponse(response);
      if (
        response.status === 200 &&
        isRecord(responseBody) &&
        responseBody.ok === true &&
        isAdminProgramReviewDecision(responseBody.decision) &&
        typeof responseBody.redirectTo === "string"
      ) {
        const fallback =
          responseBody.decision === "approve"
            ? `/admin/programs/${props.postId}?decision=approved`
            : `/admin/programs/${props.postId}?decision=rejected`;
        const redirectTo = responseBody.redirectTo.startsWith("/admin/programs/") ? responseBody.redirectTo : fallback;
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
        const serverFieldErrors = getFieldErrors(responseBody);
        if (serverFieldErrors) setFieldErrors(serverFieldErrors);
        else setFormError("현재 검토 결과를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      } else if (response.status === 400 && error === "invalid_version") {
        setFormError("검토 결과 기준 정보를 확인할 수 없습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 404 && error === "not_found") {
        setFormError("검토할 프로그램을 찾을 수 없습니다.");
      } else if (response.status === 409 && error === "edit_conflict") {
        setFormError("다른 관리자가 이 프로그램을 먼저 변경했습니다. 상세 화면을 새로 확인해 주세요.");
      } else if (response.status === 409 && error === "not_decidable") {
        setFormError("현재 게시 상태에서는 검토 결과를 처리할 수 없습니다.");
      } else {
        setFormError("현재 검토 결과를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting ? true : undefined} className="mt-5 max-w-3xl space-y-5">
      {formError ? (
        <div role="alert" className="rounded-control border border-border-strong bg-background p-4 text-danger">
          {formError}
        </div>
      ) : null}
      <fieldset aria-describedby={fieldErrors.decision ? decisionErrorId : undefined} className="space-y-3">
        <legend className="font-semibold">검토 결과 선택</legend>
        <div className="flex items-start gap-3">
          <input
            id="admin-program-review-decision-approve"
            name="decision"
            value="approve"
            type="radio"
            className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <label htmlFor="admin-program-review-decision-approve">
            <span className="font-semibold">승인</span>
            <span className="mt-1 block text-small text-muted-foreground">
              내용 검토를 승인합니다. 승인만으로 프로그램이 공개되지는 않습니다.
            </span>
          </label>
        </div>
        <div className="flex items-start gap-3">
          <input
            id="admin-program-review-decision-reject"
            name="decision"
            value="reject"
            type="radio"
            className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <label htmlFor="admin-program-review-decision-reject">
            <span className="font-semibold">반려</span>
            <span className="mt-1 block text-small text-muted-foreground">
              프로그램을 수정 가능한 초안으로 되돌립니다. 수정 후 다시 검토를 요청할 수 있습니다.
            </span>
          </label>
        </div>
        {fieldErrors.decision ? (
          <p id={decisionErrorId} className="text-small font-semibold text-danger">
            {fieldErrors.decision}
          </p>
        ) : null}
      </fieldset>
      <div className="grid gap-2">
        <div className="flex items-start gap-3">
          <input
            id="admin-program-review-decision-confirmed"
            name="decisionConfirmed"
            type="checkbox"
            aria-invalid={fieldErrors.decisionConfirmed ? true : undefined}
            aria-describedby={fieldErrors.decisionConfirmed ? confirmedErrorId : undefined}
            className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <label htmlFor="admin-program-review-decision-confirmed" className="font-semibold">
            선택한 검토 결과와 이후 프로그램 상태 변화를 확인했습니다.
          </label>
        </div>
        {fieldErrors.decisionConfirmed ? (
          <p id={confirmedErrorId} className="text-small font-semibold text-danger">
            {fieldErrors.decisionConfirmed}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "처리 중…" : "검토 결과 적용"}
      </button>
    </form>
  );
}
