"use client";

import type React from "react";

import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PublicPageHero, PublicSurface, ResultState, SummaryCard } from "@/components/public";
import PhotosReorderGrid from "@/components/reviews/PhotosReorderGrid";
import PhotosUploader from "@/components/reviews/PhotosUploader";
import ReviewTargetSummary from "@/components/reviews/ReviewTargetSummary";
import LoginGate from "@/components/system/LoginGate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { REVIEW_CONTENT_MAX_LENGTH, REVIEW_CONTENT_MIN_LENGTH, REVIEW_RATING_MIN } from "@/lib/reviews/review-input-policy";
import type { CanonicalReviewTarget, ReviewContext, ReviewSubjectType } from "@/lib/reviews/review-target";
import { getReviewContextLabel } from "@/lib/reviews/review-target";
import { buildReviewSubmissionPayload, canonicalHrefForTarget, getRequiredTargetError, getReviewDestination, getReviewPostFailureState } from "@/lib/reviews/review-write";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function Stars({ value, onChange, disabled }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={`flex justify-center gap-1 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n}점`} className={`text-ui-page-title-lg transition-all duration-200 ${value >= n ? "scale-110 text-warning" : "text-foreground"} hover:scale-125 hover:text-warning`} onClick={() => onChange?.(n)}>
          ★
        </button>
      ))}
    </div>
  );
}

type EligState = "loading" | "ok" | "already" | "notPurchased" | "noPurchase" | "notConfirmed" | "notCompleted" | "invalidStatus" | "coveredByIntegratedReview" | "orderNotFound" | "rentalNotFound" | "notFound" | "unauthorized" | "invalid" | "error";

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
  if (data.eligible) return data.nextTarget ?? data.target ? "ok" : "invalid";
  const reason = String(data.reason ?? "error");
  if (["already", "notPurchased", "noPurchase", "notConfirmed", "notCompleted", "invalidStatus", "coveredByIntegratedReview", "orderNotFound", "rentalNotFound", "notFound", "unauthorized", "invalid"].includes(reason)) return reason as EligState;
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

  const nextUrl = useMemo(() => {
    const qs = sp.toString();
    return qs ? `/reviews/write?${qs}` : "/reviews/write";
  }, [sp]);
  const blockedByLoginGate = authChecked && !isAuthenticated;
  const canonicalTarget = eligibility?.nextTarget ?? eligibility?.target ?? null;
  const targetError = getRequiredTargetError(canonicalTarget);
  const reviewDestination = canonicalTarget ? getReviewDestination(canonicalTarget) : null;
  const hasValidCanonicalTarget = Boolean(canonicalTarget && canonicalTarget.eligible && !canonicalTarget.reviewed && !targetError);
  const invalidForm = rating < REVIEW_RATING_MIN || content.trim().length < REVIEW_CONTENT_MIN_LENGTH;
  const locked = state !== "ok" || !hasValidCanonicalTarget || isSubmitting;
  const isDirty = useMemo(() => rating !== 0 || content.trim().length > 0 || photos.length > 0, [rating, content, photos.length]);

  useUnsavedChangesGuard(isDirty && !isSubmitting);
  useBackNavigationGuard(isDirty && !isSubmitting);

  const confirmLeaveIfDirty = (go: () => void) => {
    if (!isDirty || isSubmitting || typeof window === "undefined" || window.confirm(UNSAVED_CHANGES_MESSAGE)) go();
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
    if (typeof document !== "undefined" && document.cookie.includes("__e2e=1") && photos.length === 0) {
      setPhotos(["https://picsum.photos/id/10/200/200", "https://picsum.photos/id/11/200/200", "https://picsum.photos/id/12/200/200"]);
    }
  }, [photos.length]);

  useEffect(() => {
    if (!authChecked) return;
    if (blockedByLoginGate) return;
    const qs = new URLSearchParams();
    for (const key of ["reviewContext", "orderId", "productId", "applicationId", "rentalId", "service"]) {
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
        const r = await fetch(`/api/reviews/eligibility?${qs.toString()}`, { credentials: "include", cache: "no-store" });
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
    try {
      const r = await fetch("/api/reviews", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildReviewSubmissionPayload(canonicalTarget, { rating, content, photos })) });
      if (r.ok) {
        showSuccessToast("후기가 등록되었습니다.");
        router.replace(getReviewDestination(canonicalTarget).href);
        return;
      }
      const data = (await r.json().catch(() => ({}))) as { reason?: unknown; message?: unknown };
      const responseReason = data.reason ?? data.message;
      const nextState = getReviewPostFailureState(r.status, responseReason);
      if (nextState === "already") {
        setState("already");
        showInfoToast("이미 이 대상의 후기를 작성했습니다.");
        return;
      }
      if (nextState) {
        setState(nextState);
        if (nextState === "notPurchased") showInfoToast("구매/이용 이력이 있어야 후기를 작성할 수 있어요.");
        else showInfoToast(stateMessage(nextState) ?? "후기 작성 상태를 확인해 주세요.");
        return;
      }
      showErrorToast("후기 등록에 실패했습니다.");
    } catch {
      showErrorToast("네트워크 오류로 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = canonicalTarget ? getReviewContextLabel(canonicalTarget.reviewContext) : eligibility?.targetLabel ?? "후기 대상";
  const reviewPlaceholder = canonicalTarget?.reviewContext === "rental" || canonicalTarget?.reviewContext === "rental_stringing" ? "대여 라켓의 사용감과 대여 경험을 적어주세요." : canonicalTarget?.reviewContext === "standalone_stringing" || canonicalTarget?.reviewContext === "product_stringing" ? "상품 사용감과 교체서비스 경험을 함께 적어주세요." : "상품의 사용감과 만족도를 적어주세요.";
  const badge = state === "loading" ? "검증 중…" : state === "ok" ? "작성 가능" : state === "already" ? "이미 작성한 대상입니다" : state === "unauthorized" ? "로그인이 필요합니다" : state === "error" ? "오류" : "작성할 수 없어요";

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <PublicPageHero eyebrow="후기 작성" title="후기 작성" description="구매·서비스·대여 경험을 다른 사용자에게 공유해 주세요." />
        <SiteContainer className="py-6 md:py-8"><div className="mx-auto max-w-6xl space-y-5"><PublicSurface className="space-y-4"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-64 max-w-full" /><Skeleton className="h-28 w-full" /></PublicSurface><PublicSurface className="space-y-4"><Skeleton className="h-7 w-40" /><Skeleton className="h-36 w-full" /><Skeleton className="h-11 w-full sm:w-36" /></PublicSurface></div></SiteContainer>
      </div>
    );
  }
  if (blockedByLoginGate) return <LoginGate next={nextUrl} variant="default" />;

  return (
    <div className="min-h-screen bg-background">
      <PublicPageHero eyebrow="후기 작성" title="후기 작성" description="구매·서비스·대여 경험을 다른 사용자에게 공유해 주세요." actions={<><Button type="button" variant="outline" onClick={() => confirmLeaveIfDirty(() => router.replace("/reviews"))} className="w-full sm:w-auto">후기 목록</Button><Button type="button" variant="secondary" onClick={() => confirmLeaveIfDirty(() => router.replace("/mypage?tab=orders"))} className="w-full sm:w-auto">마이페이지</Button></>} />
      <SiteContainer className="py-6 md:py-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <PublicSurface className="space-y-4" padding="md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-ui-label font-medium text-muted-foreground">어떤 경험을 남기나요?</p><h2 className="mt-1 break-keep text-ui-card-title-lg font-semibold text-foreground">{title}</h2></div>
              <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-ui-label font-medium text-foreground">{badge}</span>
            </div>
            {canonicalTarget ? <ReviewTargetSummary target={canonicalTarget} /> : <p className="rounded-2xl border border-border bg-muted/30 p-4 text-ui-body-sm text-muted-foreground">후기 대상을 확인하는 중입니다.</p>}
          </PublicSurface>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <SummaryCard title="후기를 남겨주세요" description="별점, 이용 경험, 사진을 입력해 후기를 등록해 주세요.">
              <form onSubmit={onSubmit} className="space-y-6">
                {state !== "ok" && (
                  <ResultState status={state === "error" || state === "unauthorized" ? "error" : "info"} title="후기 작성 상태를 확인해 주세요" description={stateMessage(state) ?? undefined} className="rounded-2xl border border-border bg-muted/30 px-4 py-8">
                    {state === "coveredByIntegratedReview" && eligibility?.redirectHref && <Button type="button" variant="outline" onClick={() => router.replace(eligibility.redirectHref!)} className="mt-3">통합 후기 작성으로 이동</Button>}
                  </ResultState>
                )}
                {state === "invalid" && !canonicalTarget && <EmptyState title="작성할 후기를 찾을 수 없어요" description="구매확정 또는 이용확정이 완료된 내역에서 후기를 작성할 수 있습니다." action={<Button type="button" variant="outline" onClick={() => confirmLeaveIfDirty(() => router.replace("/mypage?tab=orders"))} className="w-full sm:w-auto">마이페이지에서 확인</Button>} />}

                <section className="space-y-3"><div><Label className="text-ui-body-lg font-semibold text-foreground">별점</Label><p className="mt-1 text-ui-body-sm text-muted-foreground">이용 경험에 가까운 점수를 선택하세요.</p></div><div className="rounded-2xl border border-border bg-muted/20 px-4 py-5 shadow-sm"><Stars value={rating} onChange={setRating} disabled={locked} /><div className="mt-3 text-center text-ui-body-sm font-medium text-foreground">{rating}점</div></div></section>
                <section className="space-y-3"><div className="flex items-end justify-between gap-3"><Label className="text-ui-body-lg font-semibold text-foreground">후기 내용</Label><span className="text-ui-label text-muted-foreground tabular-nums">{content.length} / {REVIEW_CONTENT_MAX_LENGTH}자</span></div><Textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={REVIEW_CONTENT_MAX_LENGTH} placeholder={reviewPlaceholder} className="min-h-[180px] resize-y rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-ring" disabled={locked} /></section>
                <section className="space-y-3"><div><Label className="text-ui-body-lg font-semibold text-foreground">사진 첨부</Label><p className="mt-1 text-ui-body-sm text-muted-foreground">선택 사항이며 최대 5장까지 등록할 수 있습니다.</p></div><div className="rounded-2xl border border-dashed border-border bg-background p-4"><PhotosUploader value={photos} onChange={setPhotos} max={5} onUploadingChange={setIsUploading} previewMode="queue" /><PhotosReorderGrid value={photos} onChange={setPhotos} disabled={locked || isUploading} />{isUploading && <div className="mt-2 text-ui-label text-muted-foreground">이미지 업로드 중...</div>}</div></section>
                <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => confirmLeaveIfDirty(goPrimary)} className="h-11 w-full overflow-hidden whitespace-nowrap rounded-xl bg-transparent sm:w-auto">{reviewDestination?.label ?? "후기 관리로 이동"}</Button><Button data-cy="submit-review" type="submit" disabled={locked || invalidForm || isUploading} aria-disabled={locked || invalidForm || isUploading} className="h-11 w-full overflow-hidden whitespace-nowrap rounded-xl font-semibold sm:w-auto">{isUploading ? "이미지 업로드 중..." : "후기 등록"}</Button></div>
              </form>
            </SummaryCard>
            <PublicSurface className="space-y-2 lg:sticky lg:top-24" padding="md"><h2 className="text-ui-body-sm font-semibold text-foreground">등록 전 확인</h2><ul className="space-y-1 text-ui-body-sm text-muted-foreground"><li>• 실제 사용 경험을 중심으로 작성해주세요.</li><li>• 사진은 선택 사항이며 최대 5장까지 등록됩니다.</li><li>• 하나의 후기 대상에는 한 번만 후기를 작성할 수 있습니다.</li></ul></PublicSurface>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
