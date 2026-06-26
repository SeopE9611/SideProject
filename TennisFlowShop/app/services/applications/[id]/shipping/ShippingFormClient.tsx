"use client";

import type React from "react";

import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import { Button } from "@/components/ui/button";
import { PublicSurface, ResultState, SummaryCard } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";
import AsyncState from "@/components/system/AsyncState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { getSelectableCourierCatalog, normalizeCourierCode } from "@/lib/shipping/courier-map";
import { normalizeTrackingNumber } from "@/lib/shipping/tracking-number";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  FileText,
  Loader2,
  Truck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { z } from "zod";

// ──────────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────────
type SelfShipInfo = {
  courier?: string;
  trackingNo?: string;
  shippedAt?: string;
  note?: string;
};

type Application = {
  _id: string;
  status: string;
  orderId?: string | null;
  rentalId?: string | null;
  orderHasRacket?: boolean;
  inboundRequired?: boolean;
  needsInboundTracking?: boolean;
  collectionMethod?: string;
  shippingInfo?: {
    collectionMethod?: string; // 실제 스키마
    selfShip?: SelfShipInfo;
  };
};

const FormSchema = z.object({
  courier: z.string().trim().min(1, "택배사를 입력하세요."),
  trackingNo: z
    .string()
    .transform((value) => normalizeTrackingNumber(value))
    .refine((value) => value.length > 0, "송장번호를 입력하세요.")
    .refine(
      (value) => value.length >= 9 && value.length <= 20,
      "송장번호는 숫자 9~20자리로 입력해 주세요.",
    ),
  shippedAt: z.string().trim().optional(),
  note: z.string().trim().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

type FieldErrors = Partial<Record<keyof FormValues, string>>;

// zod 에러를 필드별 에러로 변환 (인라인 표시/포커스 이동용)
function toFieldErrors(issues: z.ZodIssue[]): FieldErrors {
  const next: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path?.[0] as keyof FormValues | undefined;
    if (!key) continue;
    // 첫 에러만 유지(동일 필드 중복 메시지 방지)
    if (!next[key]) next[key] = issue.message;
  }
  return next;
}

function focusById(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id) as HTMLElement | null;
  if (!el) return;
  (el as any).focus?.();
  el.scrollIntoView?.({ block: "center" });
}

// ──────────────────────────────────────────────────────────────
// Wrapper: 데이터 로드/분기만 담당 (훅 순서 안정)
// ──────────────────────────────────────────────────────────────
export default function ShippingFormClient({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<Application>(
    `/api/applications/stringing/${applicationId}`,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return"); // 예: /mypage?tab=applications
  const defaultReturnTo = `/mypage?${new URLSearchParams({
    tab: "orders",
    flowType: "application",
    flowId: applicationId,
    from: "orders",
  }).toString()}`;

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto mt-8 md:mt-12 px-4">
        <AsyncState
          kind="error"
          variant="card"
          resourceName="신청 정보"
          onAction={() => {
            void mutate();
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <SelfShipForm
        applicationId={applicationId}
        isLoading={isLoading}
        returnTo={returnTo ?? undefined}
      />
    );
  }

  // 자가발송 여부
  const rawMethod = data.shippingInfo?.collectionMethod ?? data.collectionMethod ?? null;
  const normalizedMethod =
    typeof rawMethod === "string" ? normalizeCollection(rawMethod) : "self_ship";
  const fallbackOrderHasRacket =
    typeof data.orderHasRacket === "boolean" ? data.orderHasRacket : false;
  const inboundRequired =
    typeof data.inboundRequired === "boolean"
      ? data.inboundRequired
      : data.rentalId
        ? false
        : data.orderId
          ? !fallbackOrderHasRacket
          : true;
  const needsInboundTracking =
    typeof data.needsInboundTracking === "boolean"
      ? data.needsInboundTracking
      : inboundRequired && normalizedMethod === "self_ship";

  // 종료 상태(수정 금지)
  const CLOSED = ["작업 중", "교체완료"];
  const isClosed = CLOSED.includes(String(data?.status));
  if (!needsInboundTracking) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 md:py-12">
        <div className="mx-auto max-w-3xl px-4">
          <ResultState
            status="info"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="라켓 발송이 필요하지 않은 신청입니다"
            description="이 신청은 매장 보유 라켓 또는 대여 라켓 기준으로 처리되어 사용자가 별도로 라켓을 발송하지 않아도 됩니다."
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(returnTo ?? defaultReturnTo)}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  돌아가기
                </Button>
                <Button
                  onClick={() => router.push(defaultReturnTo)}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  마이페이지로 돌아가기
                </Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 md:py-12">
        <div className="mx-auto max-w-3xl px-4">
          <ResultState
            status="warning"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="이미 종료된 신청서입니다"
            description="작업 중 또는 교체완료 상태에서는 운송장을 수정할 수 없습니다."
          />
        </div>
      </div>
    );
  }

  // 3) 자가발송이면 폼 컴포넌트 렌더 (이 아래에서 추가 훅 사용해도 안전)
  return (
    <SelfShipForm
      applicationId={applicationId}
      isLoading={isLoading}
      application={data}
      returnTo={returnTo ?? undefined}
    />
  );
}

// 실제 폼
function SelfShipForm({
  applicationId,
  isLoading,
  application,
  returnTo,
}: {
  applicationId: string;
  isLoading: boolean;
  application?: Application;
  returnTo?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // 초기값은 항상 계산 (훅 순서 고정)
  const initial: FormValues = useMemo(
    () => ({
      courier: normalizeCourierCode(application?.shippingInfo?.selfShip?.courier) || "",
      trackingNo: normalizeTrackingNumber(application?.shippingInfo?.selfShip?.trackingNo),
      shippedAt: application?.shippingInfo?.selfShip?.shippedAt ?? "",
      note: application?.shippingInfo?.selfShip?.note ?? "",
    }),
    [application],
  );

  const isEdit = !isLoading && Boolean(initial.trackingNo);
  const defaultReturnTo = `/mypage?${new URLSearchParams({
    tab: "orders",
    flowType: "application",
    flowId: applicationId,
    from: "orders",
  }).toString()}`;

  const [form, setForm] = useState<FormValues>(initial);
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const isDirty =
    form.courier !== initial.courier ||
    form.trackingNo !== initial.trackingNo ||
    form.shippedAt !== initial.shippedAt ||
    form.note !== initial.note;

  // submitting 중에는 confirm 중복 뜨는 걸 막기 위해 guard 비활성
  useUnsavedChangesGuard(isDirty && !submitting);

  const confirmLeaveIfDirty = (go: () => void) => {
    if (submitting) return;
    if (!isDirty) return go();
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (ok) go();
  };

  const onChange =
    (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = k === "trackingNo" ? normalizeTrackingNumber(e.target.value) : e.target.value;
      setForm((prev) => ({ ...prev, [k]: v }));
      // 입력 중이면 해당 필드 에러를 즉시 해제 (UX)
      if (fieldErrors[k]) {
        setFieldErrors((prev) => ({ ...prev, [k]: undefined }));
      }
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submittingRef.current || submitting || isLoading || !application) return;

    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      const nextErrors = toFieldErrors(issues);
      setFieldErrors(nextErrors);

      // 기존 토스트 흐름은 유지하되, 어디가 문제인지 인라인으로도 보이게 함
      showErrorToast(issues[0]?.message ?? "입력 값을 확인해 주세요.");

      const firstKey = issues[0]?.path?.[0];
      if (typeof firstKey === "string") {
        const id = firstKey === "courier" ? "courier" : firstKey;
        focusById(id);
      }
      return;
    }

    let success = false;

    try {
      submittingRef.current = true;
      setSubmitting(true);

      const res = await fetch(`/api/applications/stringing/${applicationId}/shipping`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          shippingInfo: {
            selfShip: {
              ...parsed.data,
              courier: normalizeCourierCode(parsed.data.courier),
              trackingNo: normalizeTrackingNumber(parsed.data.trackingNo),
            },
          },
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "운송장 업데이트 실패");

      showSuccessToast("운송장 정보가 저장되었습니다.");
      // 1) 마이페이지 목록 캐시 무효화(페이지네이션 포함)

      try {
        await globalMutate(
          (key: any) => typeof key === "string" && key.startsWith("/api/applications/me"),
        );
      } catch {}
      // Activity 탭 캐시도 같이 갱신해야 "운송장 등록 → 수정" 라벨이 즉시 반영됨
      // (ActivityFeed는 /api/mypage/activity?page=... 를 사용)
      try {
        await globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/mypage/activity"),
        );
      } catch {}
      // 2) 돌아갈 경로 우선 사용
      if (returnTo) {
        success = true;
        router.replace(returnTo);
        router.refresh();
        return;
      }
      // 3) fallback: 통합 마이페이지 상세 진입 규칙(flowType/flowId)으로 이동
      success = true;
      router.replace(defaultReturnTo);
      router.refresh();
      return;
    } catch (err: any) {
      showErrorToast(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      if (!success) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 md:py-12">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-6 text-center md:mb-8">
          <h1 className="text-ui-page-title font-semibold tracking-tight text-foreground sm:text-ui-page-title-lg">
            {isLoading ? "라켓 발송 운송장 등록" : isEdit ? "라켓 발송 운송장 수정" : "라켓 발송 운송장 등록"}
          </h1>
          <p className="mt-3 text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body">
            {isLoading
              ? "라켓 발송 정보를 불러오는 중입니다."
              : "매장으로 보내는 보유 라켓의 택배사와 송장번호를 입력해주세요."}
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
          <PublicSurface variant="muted" padding="md">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <h2 className="text-ui-body font-semibold text-foreground">
                  아직 발송 전이라면 나중에 등록할 수 있습니다.
                </h2>
                <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                  라켓 발송 후 택배사와 송장번호를 입력해 주세요. 발송일과 메모는 선택 항목입니다.
                </p>
              </div>
            )}
          </PublicSurface>

          <SummaryCard
            eyebrow="라켓 발송 정보"
            title="라켓 발송 운송장"
            description="택배사 선택 → 송장번호 입력 → 필요한 경우 발송일과 메모 입력 후 저장해 주세요."
            contentClassName="space-y-4 md:space-y-6"
          >
            {isLoading ? (
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="courier"
                    className="text-ui-body font-semibold text-foreground flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4 text-primary" />
                    택배사
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.courier}
                    onValueChange={(value) => {
                      setForm((prev) => ({
                        ...prev,
                        courier: value,
                      }));
                      if (fieldErrors.courier) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          courier: undefined,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger
                      id="courier"
                      className={`h-12 text-ui-body focus:ring-2 focus:ring-ring dark:focus:ring-ring ${fieldErrors.courier ? "border-destructive focus:border-destructive" : "border-border focus:border-border"}`}
                    >
                      <SelectValue placeholder="택배사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSelectableCourierCatalog().map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="min-h-[18px] text-ui-body-sm text-destructive">
                    {fieldErrors.courier ?? ""}
                  </p>
                </div>

                {/* Tracking Number Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="trackingNo"
                    className="text-ui-body font-semibold text-foreground flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-foreground" />
                    송장번호
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="trackingNo"
                    value={form.trackingNo}
                    onChange={onChange("trackingNo")}
                    placeholder="예: 1234567890"
                    className={`h-12 text-ui-body focus:ring-2 focus:ring-ring dark:focus:ring-ring ${fieldErrors.trackingNo ? "border-destructive focus:border-destructive" : "border-border focus:border-border dark:focus:border-border"}`}
                  />
                  <p className="min-h-[18px] text-ui-body-sm text-destructive">
                    {fieldErrors.trackingNo ?? ""}
                  </p>
                </div>

                {/* Shipped Date Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="shippedAt"
                    className="text-ui-body font-semibold text-foreground flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-primary dark:text-foreground" />
                    발송일
                    <span className="text-ui-label text-muted-foreground font-normal">(선택사항)</span>
                  </Label>
                  <Input
                    id="shippedAt"
                    type="date"
                    value={form.shippedAt ?? ""}
                    onChange={onChange("shippedAt")}
                    className="h-12 text-ui-body border-border focus:border-border dark:focus:border-border focus:ring-2 focus:ring-ring dark:focus:ring-ring"
                  />
                </div>

                {/* Note Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="note"
                    className="text-ui-body font-semibold text-foreground flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    메모
                    <span className="text-ui-label text-muted-foreground font-normal">(선택사항)</span>
                  </Label>
                  <Textarea
                    id="note"
                    value={form.note ?? ""}
                    onChange={onChange("note")}
                    placeholder="포장 상태, 수거 관련 참고사항 등을 입력해 주세요"
                    rows={4}
                    className="text-ui-body border-border focus:border-border dark:focus:border-border focus:ring-2 focus:ring-ring dark:focus:ring-ring resize-none"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 md:pt-6">
              {isLoading ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => confirmLeaveIfDirty(() => history.back())}
                    disabled={submitting}
                    className="flex-1 h-12 text-ui-body border-border hover:bg-background dark:hover:bg-card"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    돌아가기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => confirmLeaveIfDirty(() => router.push(returnTo ?? defaultReturnTo))}
                    disabled={submitting}
                    className="flex-1 h-12 text-ui-body border-border hover:bg-background dark:hover:bg-card"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    마이페이지로 돌아가기
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-12 text-ui-body bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {submitting ? "저장 중…" : isEdit ? "수정하기" : "저장하기"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </SummaryCard>
        </form>
      </div>
    </div>
  );
}
