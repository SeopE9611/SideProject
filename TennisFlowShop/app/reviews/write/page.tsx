"use client";

import type React from "react";

import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, ResultState } from "@/components/public";
import PhotosReorderGrid from "@/components/reviews/PhotosReorderGrid";
import PhotosUploader from "@/components/reviews/PhotosUploader";
import ReviewRatingInput from "@/components/reviews/ReviewRatingInput";
import ReviewTargetSummary from "@/components/reviews/ReviewTargetSummary";
import ReviewWriteChecklist from "@/components/reviews/ReviewWriteChecklist";
import ReviewWriteMobileBar from "@/components/reviews/ReviewWriteMobileBar";
import ReviewWriteProgress from "@/components/reviews/ReviewWriteProgress";
import LoginGate from "@/components/system/LoginGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import {
  REVIEW_CONTENT_MAX_LENGTH,
  REVIEW_CONTENT_MIN_LENGTH,
  REVIEW_RATING_MIN,
} from "@/lib/reviews/review-input-policy";
import { useReviewPhotoUploadSession } from "@/lib/reviews/useReviewPhotoUploadSession";
import type {
  CanonicalReviewTarget,
  ReviewContext,
  ReviewSubjectType,
} from "@/lib/reviews/review-target";
import { getReviewContextLabel } from "@/lib/reviews/review-target";
import {
  buildReviewSubmissionPayload,
  canonicalHrefForTarget,
  getRequiredTargetError,
  getReviewDestination,
  getReviewPostFailureState,
} from "@/lib/reviews/review-write";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type EligState =
  | "loading"
  | "ok"
  | "already"
  | "notPurchased"
  | "noPurchase"
  | "notConfirmed"
  | "notCompleted"
  | "invalidStatus"
  | "coveredByIntegratedReview"
  | "orderNotFound"
  | "rentalNotFound"
  | "notFound"
  | "unauthorized"
  | "invalid"
  | "error";

type EligibilityPayload = {
  eligible: boolean;
  reason: string | null;
  subjectType?: ReviewSubjectType;
  subjectId?: string;
  reviewContext?: ReviewContext | null;
  targetLabel?: string | null;
  suggestedOrderId?: string | null;
  suggestedProductId?: string | null;
  suggestedApplicationId?: string | null;
  suggestedRentalId?: string | null;
  target?: CanonicalReviewTarget | null;
  nextTarget?: CanonicalReviewTarget | null;
  redirectHref?: string | null;
  coveredBySubjectType?: "order" | "rental" | null;
  coveredBySubjectId?: string | null;
};

function stateFromReason(data: EligibilityPayload): EligState {
  if (data.eligible) return (data.nextTarget ?? data.target) ? "ok" : "invalid";
  const reason = String(data.reason ?? "error");
  if (
    [
      "already",
      "notPurchased",
      "noPurchase",
      "notConfirmed",
      "notCompleted",
      "invalidStatus",
      "coveredByIntegratedReview",
      "orderNotFound",
      "rentalNotFound",
      "notFound",
      "unauthorized",
      "invalid",
    ].includes(reason)
  )
    return reason as EligState;
  return "invalid";
}

function stateMessage(state: EligState) {
  switch (state) {
    case "already":
      return "이미 이 대상의 후기를 작성했습니다.";
    case "notConfirmed":
    case "noPurchase":
    case "notPurchased":
      return "구매확정 또는 이용확정 후 후기를 작성할 수 있습니다.";
    case "notCompleted":
      return "서비스가 완료된 후 후기를 작성할 수 있습니다.";
    case "invalidStatus":
      return "취소되거나 작성할 수 없는 이용 내역입니다.";
    case "coveredByIntegratedReview":
      return "이 이용은 상위 주문 또는 대여의 통합 후기로 작성해야 합니다.";
    case "orderNotFound":
    case "rentalNotFound":
    case "notFound":
    case "invalid":
      return "후기 대상을 찾을 수 없습니다.";
    case "unauthorized":
      return "로그인이 필요합니다.";
    case "loading":
      return "작성 가능 여부를 확인하고 있습니다.";
    case "error":
      return "접근 확인 중 문제가 발생했어요.";
    case "ok":
      return null;
  }
}

export default function ReviewWritePage() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityPayload | null>(null);
  const [state, setState] = useState<EligState>("loading");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toastLocked = useRef(false);
  const canonicalRewriteDone = useRef(false);
  const photoSession = useReviewPhotoUploadSession();

  const nextUrl = useMemo(() => {
    const qs = sp.toString();
    return qs ? `/reviews/write?${qs}` : "/reviews/write";
  }, [sp]);
  const blockedByLoginGate = authChecked && !isAuthenticated;
  const canonicalTarget = eligibility?.nextTarget ?? eligibility?.target ?? null;
  const targetError = getRequiredTargetError(canonicalTarget);
  const reviewDestination = canonicalTarget ? getReviewDestination(canonicalTarget) : null;
  const hasValidCanonicalTarget = Boolean(
    canonicalTarget && canonicalTarget.eligible && !canonicalTarget.reviewed && !targetError,
  );
  const targetVerified = state === "ok" && hasValidCanonicalTarget;
  const formStarted = rating > 0 || content.trim().length > 0 || photos.length > 0;
  const ratingReady = rating >= REVIEW_RATING_MIN;
  const contentReady = content.trim().length >= REVIEW_CONTENT_MIN_LENGTH;
  const invalidForm = !ratingReady || !contentReady;
  const locked = state !== "ok" || !hasValidCanonicalTarget || isSubmitting;
  const isDirty = useMemo(
    () => rating !== 0 || content.trim().length > 0 || photos.length > 0,
    [rating, content, photos.length],
  );

  useUnsavedChangesGuard(isDirty && !isSubmitting);
  useBackNavigationGuard(isDirty && !isSubmitting);

  const confirmLeaveIfDirty = (go: () => void) => {
    if (
      !isDirty ||
      isSubmitting ||
      typeof window === "undefined" ||
      window.confirm(UNSAVED_CHANGES_MESSAGE)
    )
      go();
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me", { credentials: "include" });
        const user = await res.json().catch(() => ({}));
        if (!cancelled) setIsAuthenticated(Boolean((user as { email?: unknown })?.email));
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;
    void photoSession.startSession();
  }, [authChecked, isAuthenticated, photoSession.startSession]);

  useEffect(() => {
    if (!authChecked) return;
    if (blockedByLoginGate) return;
    const qs = new URLSearchParams();
    for (const key of [
      "reviewContext",
      "orderId",
      "productId",
      "applicationId",
      "rentalId",
      "service",
    ]) {
      const value = sp.get(key);
      if (value) qs.set(key, value);
    }
    if (!qs.toString()) {
      setState("invalid");
      setEligibility(null);
      return;
    }
    let aborted = false;
    (async () => {
      try {
        setState("loading");
        const r = await fetch(`/api/reviews/eligibility?${qs.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (aborted) return;
        if (r.status === 401) {
          setState("unauthorized");
          setEligibility(null);
          return;
        }
        const data = (await r.json()) as EligibilityPayload;
        setEligibility(data);
        setState(stateFromReason(data));
      } catch {
        if (aborted) return;
        setState("error");
        if (!toastLocked.current) {
          toastLocked.current = true;
          showErrorToast("접근 확인 중 문제가 발생했어요.");
        }
      }
    })();
    return () => {
      aborted = true;
    };
  }, [authChecked, blockedByLoginGate, sp]);

  useEffect(() => {
    if (!canonicalTarget || canonicalRewriteDone.current || isDirty || isSubmitting) return;
    const nextHref = canonicalHrefForTarget(canonicalTarget);
    const currentHref = `${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
    if (nextHref !== currentHref) {
      canonicalRewriteDone.current = true;
      router.replace(nextHref);
    }
  }, [canonicalTarget, isDirty, isSubmitting, pathname, router, sp]);

  useEffect(() => {
    if (state === "ok" && targetError) setState("invalid");
  }, [state, targetError]);

  const goPrimary = () => {
    void photoSession.cleanupUncommittedPhotos();
    photoSession.resetSession();
    router.replace(reviewDestination?.href ?? "/mypage?tab=reviews");
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (locked || invalidForm || !canonicalTarget) return;
    if (rating < REVIEW_RATING_MIN) {
      showErrorToast("별점은 1점부터 5점까지 선택해 주세요.");
      return;
    }
    if (content.trim().length < REVIEW_CONTENT_MIN_LENGTH) {
      showErrorToast("후기 내용은 5자 이상 입력해 주세요.");
      return;
    }
    const error = getRequiredTargetError(canonicalTarget);
    if (error) {
      setState("invalid");
      showErrorToast(error);
      return;
    }
    setIsSubmitting(true);
    photoSession.markSaving();
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildReviewSubmissionPayload(canonicalTarget, { rating, content, photos }),
          uploadSessionId: photoSession.uploadSessionId,
        }),
      });
      if (r.ok) {
        photoSession.markCommitted();
        showSuccessToast("후기가 등록되었습니다.");
        router.replace(getReviewDestination(canonicalTarget).href);
        return;
      }
      const data = (await r.json().catch(() => ({}))) as { reason?: unknown; message?: unknown };
      const responseReason = data.reason ?? data.message;
      const nextState = getReviewPostFailureState(r.status, responseReason);
      if (nextState === "already") {
        photoSession.markSaveFailed();
        setState("already");
        showInfoToast("이미 이 대상의 후기를 작성했습니다.");
        return;
      }
      if (nextState) {
        photoSession.markSaveFailed();
        setState(nextState);
        if (nextState === "notPurchased")
          showInfoToast("구매/이용 이력이 있어야 후기를 작성할 수 있어요.");
        else showInfoToast(stateMessage(nextState) ?? "후기 작성 상태를 확인해 주세요.");
        return;
      }
      photoSession.markSaveFailed();
      showErrorToast("후기 등록에 실패했습니다.");
    } catch {
      photoSession.markSaveFailed();
      showErrorToast("네트워크 오류로 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = canonicalTarget
    ? getReviewContextLabel(canonicalTarget.reviewContext)
    : (eligibility?.targetLabel ?? "후기 대상");
  const reviewPlaceholder =
    canonicalTarget?.reviewContext === "rental" ||
    canonicalTarget?.reviewContext === "rental_stringing"
      ? "대여 라켓의 사용감과 대여 경험을 적어주세요."
      : canonicalTarget?.reviewContext === "standalone_stringing" ||
          canonicalTarget?.reviewContext === "product_stringing"
        ? "상품 사용감과 교체서비스 경험을 함께 적어주세요."
        : "상품의 사용감과 만족도를 적어주세요.";
  const badge =
    state === "loading"
      ? "검증 중…"
      : state === "ok"
        ? "작성 가능"
        : state === "already"
          ? "이미 작성한 대상입니다"
          : state === "unauthorized"
            ? "로그인이 필요합니다"
            : state === "error"
              ? "오류"
              : "작성할 수 없어요";
  const badgeVariant =
    state === "loading"
      ? "secondary"
      : state === "ok"
        ? "success"
        : state === "already"
          ? "neutral"
          : state === "unauthorized"
            ? "warning"
            : state === "error"
              ? "danger"
              : state === "coveredByIntegratedReview"
                ? "info"
                : "warning";

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background pb-28 bp-lg:pb-0">
        <SiteContainer className="py-6 bp-md:py-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <Card variant="feature">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-8 w-72 max-w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <Skeleton className="h-20 w-full rounded-panel" />
            <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card>
                <CardContent className="space-y-5 p-5">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
              <Skeleton className="hidden h-56 rounded-panel bp-lg:block" />
            </div>
          </div>
        </SiteContainer>
      </div>
    );
  }
  if (blockedByLoginGate) return <LoginGate next={nextUrl} variant="default" />;

  return (
    <div className="min-h-screen bg-background pb-28 bp-lg:pb-0">
      <SiteContainer className="py-6 bp-md:py-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <Card variant="feature" className="rounded-panel">
            <CardContent className="space-y-4 p-5 bp-md:p-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  confirmLeaveIfDirty(() => {
                    void photoSession.cleanupUncommittedPhotos();
                    photoSession.resetSession();
                    router.replace("/reviews");
                  })
                }
                className="h-auto w-fit px-0 text-ui-body-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                ← 후기 목록
              </Button>
              <div className="space-y-2">
                <Badge variant="signal" className="w-fit">
                  VERIFIED EXPERIENCE
                </Badge>
                <h1 className="break-keep font-ui-bold text-ui-section-title font-bold text-foreground">
                  확인된 경험을 후기로 남겨주세요
                </h1>
                <p className="max-w-2xl text-ui-body-sm text-muted-foreground">
                  구매·대여·교체서비스를 완료한 경험만 후기로 등록할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <ReviewWriteProgress
            targetVerified={targetVerified}
            formStarted={formStarted}
            isSubmitting={isSubmitting}
            isLoading={state === "loading"}
          />

          <Card className="rounded-panel border-border bg-card shadow-soft">
            <CardContent className="space-y-4 p-4 bp-sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ui-label font-medium text-muted-foreground">
                    어떤 경험을 남기나요?
                  </p>
                  <h2 className="mt-1 break-keep text-ui-card-title-lg font-semibold text-foreground">
                    {title}
                  </h2>
                </div>
                <Badge variant={badgeVariant} className="shrink-0">
                  {badge}
                </Badge>
              </div>
              {canonicalTarget ? (
                <ReviewTargetSummary target={canonicalTarget} />
              ) : (
                <p className="rounded-panel border border-border bg-muted/30 p-4 text-ui-body-sm text-muted-foreground">
                  후기 대상을 확인하는 중입니다.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="bp-lg:hidden">
            <ReviewWriteChecklist
              targetReady={targetVerified}
              ratingReady={ratingReady}
              contentReady={contentReady}
              photosCount={photos.length}
              isUploading={isUploading}
            />
          </div>

          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_320px] bp-lg:items-start">
            <Card className="rounded-panel border-border bg-card shadow-soft">
              <CardContent className="p-4 bp-sm:p-6">
                <form id="review-write-form" onSubmit={onSubmit} className="space-y-7">
                  {state !== "ok" && (
                    <ResultState
                      status={state === "error" || state === "unauthorized" ? "error" : "info"}
                      title={
                        state === "already"
                          ? "이미 작성한 대상입니다."
                          : "후기 작성 상태를 확인해 주세요"
                      }
                      description={stateMessage(state) ?? undefined}
                      className="rounded-panel border border-border bg-muted/30 px-4 py-8"
                    >
                      {state === "coveredByIntegratedReview" && eligibility?.redirectHref && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.replace(eligibility.redirectHref!)}
                          className="mt-3"
                        >
                          통합 후기 작성으로 이동
                        </Button>
                      )}
                    </ResultState>
                  )}
                  {state === "invalid" && !canonicalTarget && (
                    <EmptyState
                      title="작성할 후기를 찾을 수 없어요"
                      description="구매확정 또는 이용확정이 완료된 내역에서 후기를 작성할 수 있습니다."
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            confirmLeaveIfDirty(() => router.replace("/mypage?tab=orders"))
                          }
                          className="w-full bp-sm:w-auto"
                        >
                          마이페이지에서 확인
                        </Button>
                      }
                    />
                  )}

                  <section className="space-y-3">
                    <div>
                      <Label className="text-ui-body-lg font-semibold text-foreground">별점</Label>
                      <p className="mt-1 text-ui-body-sm text-muted-foreground">
                        이용 경험에 가까운 점수를 선택하세요.
                      </p>
                    </div>
                    <div className="rounded-panel border border-border bg-background px-3 py-5">
                      <ReviewRatingInput value={rating} onChange={setRating} disabled={locked} />
                    </div>
                  </section>
                  <section className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <Label className="text-ui-body-lg font-semibold text-foreground">
                          후기 내용
                        </Label>
                        <p className="mt-1 text-ui-body-sm text-muted-foreground">
                          직접 경험한 만족도와 도움이 될 정보를 적어주세요.
                        </p>
                      </div>
                      <span className="text-ui-label text-muted-foreground tabular-nums">
                        {content.length} / {REVIEW_CONTENT_MAX_LENGTH}자
                      </span>
                    </div>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={REVIEW_CONTENT_MAX_LENGTH}
                      placeholder={reviewPlaceholder}
                      className="min-h-[180px] resize-y rounded-control border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={locked}
                    />
                    {content.length > 0 && content.trim().length < REVIEW_CONTENT_MIN_LENGTH && (
                      <p className="text-ui-label text-warning">
                        후기 내용은 5자 이상 입력해 주세요.
                      </p>
                    )}
                    {content.length > REVIEW_CONTENT_MAX_LENGTH - 20 && (
                      <p className="text-ui-label text-warning">최대 글자 수에 가까워졌어요.</p>
                    )}
                  </section>
                  <section className="space-y-3">
                    <div>
                      <Label className="text-ui-body-lg font-semibold text-foreground">
                        사진 첨부
                      </Label>
                      <p className="mt-1 text-ui-body-sm text-muted-foreground">
                        선택 사항이며 최대 5장까지 등록할 수 있습니다.
                      </p>
                    </div>
                    <div className="rounded-panel border border-border bg-background p-4">
                      <PhotosUploader
                        variant="dropzone"
                        value={photos}
                        onChange={setPhotos}
                        max={5}
                        onUploadingChange={setIsUploading}
                        onUploaded={photoSession.registerUploadedUrls}
                        onRemove={photoSession.removeUploadedUrl}
                        uploadSessionId={photoSession.uploadSessionId}
                        previewMode="queue"
                        disabled={locked || isUploading || !photoSession.uploadSessionId}
                      />
                      <PhotosReorderGrid
                        value={photos}
                        onChange={setPhotos}
                        onRemove={(url) => {
                          const sessionId = photoSession.uploadSessionId;
                          if (sessionId) void photoSession.removeUploadedUrl(url, sessionId);
                        }}
                        disabled={locked || isUploading}
                        mobileControls
                        responsiveColumns
                      />
                      {isUploading && (
                        <div
                          className="mt-2 text-ui-label text-muted-foreground"
                          aria-live="polite"
                        >
                          이미지 업로드 중...
                        </div>
                      )}
                    </div>
                  </section>
                  <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 bp-sm:flex-row bp-sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => confirmLeaveIfDirty(goPrimary)}
                      className="h-11 w-full overflow-hidden whitespace-nowrap rounded-control bg-transparent bp-sm:w-auto"
                    >
                      {reviewDestination?.label ?? "후기 관리로 이동"}
                    </Button>
                    <Button
                      data-cy="submit-review"
                      type="submit"
                      variant="highlight"
                      disabled={locked || invalidForm || isUploading}
                      aria-disabled={locked || invalidForm || isUploading}
                      className="hidden h-11 w-full overflow-hidden whitespace-nowrap rounded-control font-semibold bp-lg:inline-flex bp-lg:w-auto"
                    >
                      {isSubmitting ? "등록 중" : isUploading ? "이미지 업로드 중..." : "후기 등록"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <ReviewWriteChecklist
              targetReady={targetVerified}
              ratingReady={ratingReady}
              contentReady={contentReady}
              photosCount={photos.length}
              isUploading={isUploading}
              className="hidden bp-lg:sticky bp-lg:top-24 bp-lg:block"
            />
          </div>
        </div>
      </SiteContainer>
      <ReviewWriteMobileBar
        locked={locked}
        invalidForm={invalidForm}
        isUploading={isUploading}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
