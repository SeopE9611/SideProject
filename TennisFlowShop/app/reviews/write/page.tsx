"use client";

import type React from "react";

import ApplicationStatusBadge from "@/app/features/stringing-applications/components/ApplicationStatusBadge";
import SiteContainer from "@/components/layout/SiteContainer";
import {
  EmptyState,
  PublicPageHero,
  PublicSurface,
  ResultState,
  SummaryCard,
} from "@/components/public";
import PhotosReorderGrid from "@/components/reviews/PhotosReorderGrid";
import PhotosUploader from "@/components/reviews/PhotosUploader";
import LoginGate from "@/components/system/LoginGate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { isStringingCompletedStatus } from "@/lib/status/flow-status";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/* ---- 별점 ---- */
function Stars({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex justify-center gap-1 ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}점`}
          className={`text-ui-page-title-lg transition-all duration-200 ${value >= n ? "text-warning scale-110" : "text-foreground"} hover:scale-125 hover:text-warning`}
          onClick={() => onChange?.(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type OrderReviewItem = {
  productId: string;
  name: string;
  image: string | null;
  reviewed: boolean;
};

type MiniMeta = {
  name: string;
  image: string | null;
  kind: "product" | "racket";
  href: string;
};

type RentalMeta = {
  id: string;
  name: string;
  image: string | null;
  days?: number | null;
  status?: string | null;
  createdAt?: string | null;
  dueAt?: string | null;
  returnedAt?: string | null;
};

type EligState =
  | "loading"
  | "ok"
  | "notPurchased"
  | "already"
  | "serviceLinkedOrder"
  | "rentalNotFound"
  | "notConfirmed"
  | "invalidStatus"
  | "unauthorized"
  | "invalid"
  | "error";
type AppLite = {
  _id: string;
  label: string;
  status?: string;
  racketType?: string | null;
  stringItems?: { id: string; name: string }[];
  preferredDate?: string | null;
  preferredTime?: string | null;
  desiredDateTime?: string | null;
  createdAt?: string | null;
  requirements?: string | null;
};

function isServiceReviewSelectableStatus(status?: string | null) {
  const normalized = String(status ?? "").trim();
  return isStringingCompletedStatus(normalized) || normalized === "반송완료" || normalized === "완료";
}

// 예약일자 포멧
function formatKoDate(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function formatKoTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function formatYMD(dateStr?: string | null) {
  if (!dateStr) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr; // 예외: 그대로 표시
  const [, y, mo, d] = m;
  return `${y}. ${mo}. ${d}.`;
}

function formatHM(timeStr?: string | null) {
  if (!timeStr) return "";
  return timeStr;
}

// 신청일자 포멧
function formatKoDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

// 서비스 신청서에서 "라켓" 표시용 문자열을 안전하게 뽑아오기
// - 우선순위: stringDetails.racketType(단일) -> racketType(루트) -> stringDetails.racketLines[0].racketLabel/racketType
function getRacketSummary(a: any) {
  const direct = (a?.stringDetails?.racketType ?? a?.racketType ?? "").toString().trim();
  if (direct) return direct;

  const lines = Array.isArray(a?.stringDetails?.racketLines) ? a.stringDetails.racketLines : [];
  if (!lines.length) return "";

  const first = (lines[0]?.racketLabel ?? lines[0]?.racketType ?? "").toString().trim();
  if (first) return lines.length > 1 ? `${first} 외 ${lines.length - 1}자루` : first;

  return `라켓 ${lines.length}자루`;
}

function buildAppLabel(a: any) {
  const when = a?.stringDetails?.preferredDate
    ? `${formatYMD(a.stringDetails.preferredDate)} ${a.stringDetails.preferredTime ?? ""}`.trim()
    : a?.desiredDateTime
      ? formatKoDateTime(a.desiredDateTime)
      : "";

  const racket = getRacketSummary(a);

  const names = (a?.stringDetails?.stringItems || a?.stringItems || [])
    .map((s: any) => s?.name)
    .filter(Boolean) as string[];
  const strings =
    names.length > 2 ? `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}` : names.join(", ");

  return [when, racket, strings].filter(Boolean).join(" • ");
}

export default function ReviewWritePage() {
  const sp = useSearchParams();
  const router = useRouter();

  // 비회원 주문/신청 차단 정책(클라)
  // - NEXT_PUBLIC_GUEST_ORDER_MODE: 'off' | 'legacy' | 'on'
  // - 'on' 일 때만 비회원 허용
  const rawGuestMode = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
  const guestOrderMode =
    rawGuestMode === "off" || rawGuestMode === "legacy" || rawGuestMode === "on"
      ? rawGuestMode
      : "legacy";
  const allowGuestCheckout = guestOrderMode === "on";

  // 로그인 여부(비회원 차단 모드에서만 의미 있음)
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const nextUrl = useMemo(() => {
    const qs = sp.toString();
    return qs ? `/reviews/write?${qs}` : "/reviews/write";
  }, [sp]);

  const blockedByLoginGate = !allowGuestCheckout && authChecked && !isAuthenticated;

  // 로그인 상태 체크 (비회원 차단 모드에서만 필요)
  // - 체크가 끝나기 전에는 아래 useEffect들이(eligibility/신청서 목록/주문 아이템 조회 등) 먼저 fetch를 치지 않도록 가드.
  useEffect(() => {
    if (allowGuestCheckout) {
      setAuthChecked(true);
      setIsAuthenticated(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me", { credentials: "include" });
        const user = await res.json().catch(() => ({}));
        if (cancelled) return;
        setIsAuthenticated(Boolean((user as any)?.email));
      } catch {
        if (cancelled) return;
        setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowGuestCheckout]);

  // URL 파라미터
  const productIdParam = sp.get("productId");
  const orderIdParam = sp.get("orderId"); // URL에서 orderId 읽기
  const service = sp.get("service"); // 'stringing'
  const applicationIdParam = sp.get("applicationId"); // Activity에서 넘어온 대상 신청서
  const rentalIdParam = sp.get("rentalId");

  // 보정된 productId / orderId (URL이 비어있어도 서버 추천으로 채움)
  const [resolvedProductId, setResolvedProductId] = useState<string | null>(productIdParam);
  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(orderIdParam);

  // 모드 결정: rentalId가 있으면 대여 리뷰를 product/service보다 우선합니다.
  const mode: "product" | "service" | "rental" | "invalid" = useMemo(() => {
    if (rentalIdParam) return "rental";
    if (resolvedProductId) return "product";
    if (service === "stringing") return "service";
    return "invalid";
  }, [rentalIdParam, resolvedProductId, service]);

  // 폼 상태
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력/사진/별점 중 하나라도 변경되면 이탈 경고 대상(= dirty)
  const isDirty = useMemo(() => {
    return rating !== 5 || content.trim().length > 0 || photos.length > 0;
  }, [rating, content, photos.length]);

  useUnsavedChangesGuard(isDirty && !isSubmitting);
  useBackNavigationGuard(isDirty && !isSubmitting);

  const resetForm = () => {
    setRating(5);
    setContent("");
    setPhotos([]);
  };

  const confirmLeaveIfDirty = (go: () => void) => {
    // 제출 중에는 이탈 확인을 띄우지 않음(중복 confirm 방지)
    if (!isDirty || isSubmitting) {
      go();
      return;
    }
    if (typeof window === "undefined") {
      go();
      return;
    }
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (ok) go();
  };

  // E2E에서만(쿠키 __e2e=1) 최초 진입 시 샘플 이미지 3장 시드
  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.cookie.includes("__e2e=1") &&
      photos.length === 0
    ) {
      setPhotos([
        "https://picsum.photos/id/10/200/200",
        "https://picsum.photos/id/11/200/200",
        "https://picsum.photos/id/12/200/200",
      ]);
    }
  }, [photos.length, setPhotos]);

  // 접근 상태
  const [state, setState] = useState<EligState>("loading");
  const toastLocked = useRef(false);

  // 서비스 모드에서 사용할 신청서 목록/ 선택
  const [apps, setApps] = useState<AppLite[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // 전체 신청서(비활성 포함) + 토글 + 이미 리뷰 작성한 신청서 맵
  const [allApps, setAllApps] = useState<AppLite[]>([]);
  const [showAllApps, setShowAllApps] = useState(false);
  const [reviewedMap, setReviewedMap] = useState<Record<string, true>>({});
  // 서비스 모드에서 서버 eligibility가 추천한 신청서 ID를 저장해
  // 중복 네트워크 호출 없이 기본 선택값 계산에 재사용합니다.
  const [serviceSuggestedAppId, setServiceSuggestedAppId] = useState<string | null>(null);

  // 주문 아이템/현재 상품 메타
  const [orderItems, setOrderItems] = useState<OrderReviewItem[] | null>(null);
  const [currentMeta, setCurrentMeta] = useState<MiniMeta | null>(null);
  const [rentalMeta, setRentalMeta] = useState<RentalMeta | null>(null);

  // orderId-only 진입 시 추천 productId 받기
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    if (rentalIdParam || productIdParam || !orderIdParam || resolvedProductId) return;
    let aborted = false;
    (async () => {
      try {
        setState("loading");
        const r = await fetch(
          `/api/reviews/eligibility?orderId=${encodeURIComponent(orderIdParam)}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );
        if (aborted) return;
        if (r.status === 401) {
          setState("unauthorized");
          return;
        }
        const d = await r.json();
        if (d.eligible && d.suggestedProductId) {
          setResolvedProductId(String(d.suggestedProductId));
          if (d.suggestedOrderId && !resolvedOrderId) {
            setResolvedOrderId(String(d.suggestedOrderId));
          }
        } else {
          // 추천 실패(이미 작성 등)
          setState(d.reason ?? "invalid");
          if (!toastLocked.current) {
            toastLocked.current = true;
            if (d.reason === "serviceLinkedOrder") {
              showInfoToast(
                "교체서비스가 연결된 주문은 상품과 교체서비스 경험을 하나의 이용 후기로 작성할 수 있습니다.",
              );
            } else {
              showErrorToast("잘못된 접근입니다.");
            }
          }
        }
      } catch {
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
  }, [
    productIdParam,
    orderIdParam,
    rentalIdParam,
    resolvedProductId,
    resolvedOrderId,
    allowGuestCheckout,
    authChecked,
    blockedByLoginGate,
  ]);

  // 일반 eligibility 검사
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    let aborted = false;
    async function run() {
      setState("loading");
      // invalid인데 orderId-only 보정 대기 중이라면 잠시 보류
      if (mode === "invalid" && orderIdParam && !resolvedProductId) {
        return; // orderId-only 보정 대기
      }
      if (mode === "invalid") {
        setState("invalid");
        if (!toastLocked.current) {
          toastLocked.current = true;
          showErrorToast("잘못된 접근입니다.");
        }
        return;
      }
      const qs =
        mode === "product"
          ? `productId=${encodeURIComponent(resolvedProductId!)}${resolvedOrderId ? `&orderId=${encodeURIComponent(resolvedOrderId)}` : ""}`
          : mode === "rental"
            ? `rentalId=${encodeURIComponent(rentalIdParam!)}`
            : `service=stringing${applicationIdParam ? `&applicationId=${encodeURIComponent(applicationIdParam)}` : ""}`;
      try {
        const r = await fetch(`/api/reviews/eligibility?${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (aborted) return;
        if (r.status === 401) {
          setState("unauthorized");
          return;
        }

        const data = await r.json();
        if (
          mode === "product" &&
          data?.reason === "serviceLinkedOrder" &&
          data?.suggestedApplicationId
        ) {
          router.replace(
            `/reviews/write?service=stringing&applicationId=${encodeURIComponent(
              String(data.suggestedApplicationId),
            )}`,
          );
          return;
        }
        // 서버가 추천해준 주문ID가 있으면 저장
        if (data.suggestedOrderId && !resolvedOrderId) {
          setResolvedOrderId(String(data.suggestedOrderId));
        }

        // 서비스 모드의 추천 신청서 ID를 별도 상태에 저장해
        // 아래 서비스 목록 effect에서 eligibility를 다시 호출하지 않도록 합니다.
        // (초기 진입 시 불필요한 1회 fetch 제거)
        if (mode === "service") {
          setServiceSuggestedAppId(
            data.suggestedApplicationId ? String(data.suggestedApplicationId) : null,
          );
        } else {
          setServiceSuggestedAppId(null);
        }

        setState(data.eligible ? "ok" : (data.reason as EligState) || "error");
      } catch {
        setState("error");
        if (!toastLocked.current) {
          toastLocked.current = true;
          showErrorToast("접근 확인 중 문제가 발생했어요.");
        }
      }
    }
    run();
    return () => {
      aborted = true;
    };
  }, [
    mode,
    resolvedProductId,
    resolvedOrderId,
    orderIdParam,
    applicationIdParam,
    rentalIdParam,
    allowGuestCheckout,
    authChecked,
    blockedByLoginGate,
    router,
  ]);

  // 서비스 모드: 내 신청서 목록 + 추천값 세팅
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    if (mode !== "service") return;
    let aborted = false;

    (async () => {
      // 초기 진입 체감 개선 포인트:
      // - 신청서 목록(list)과 내 리뷰 목록(mine)은 서로 의존하지 않으므로 병렬 시작
      // - UI의 "첫 선택 가능 상태"를 빠르게 만들기 위해 목록을 먼저 반영하고
      //   mine 결과는 후순위로 적용해(중복 작성한 신청서 제외) 목록을 정교화합니다.
      const listPromise = fetch("/api/applications/stringing/list", {
        credentials: "include",
        cache: "no-store",
      });
      const minePromise = fetch("/api/reviews/mine?limit=50", {
        credentials: "include",
        cache: "no-store",
      });

      // 전체 신청서(원본) 조회
      const listRes = await listPromise;
      const list = (await listRes.json()) as any[];
      if (aborted) return;

      // 라벨/요약을 가진 AppLite로 포맷
      const formattedAll: AppLite[] = (list || []).map((a) => ({
        _id: String(a._id),
        label: buildAppLabel(a),
        status: a.status,
        racketType: getRacketSummary(a) || null,
        stringItems: a?.stringDetails?.stringItems ?? [],
        preferredDate: a?.stringDetails?.preferredDate ?? null,
        preferredTime: a?.stringDetails?.preferredTime ?? null,
        desiredDateTime: a?.desiredDateTime ?? a?.stringDetails?.desiredDateTime ?? null,
        createdAt: a?.createdAt ?? null,
        requirements: a?.stringDetails?.requirements ?? null,
      }));

      // 전체 목록 세팅(토글용)
      setAllApps(formattedAll);

      // 1차(초기 필수) 목록: 서비스 완료 계열 상태만 반영
      // - 첫 진입에서는 "선택 가능한 최소 목록"이 우선 필요
      // - 이미 리뷰한 신청서 제외는 아래 mine 응답이 오면 후순위로 정밀 반영
      const eligibleByStatus = formattedAll.filter((x) =>
        isServiceReviewSelectableStatus(x.status),
      );
      setApps(eligibleByStatus);

      // URL로 applicationId가 넘어오면 그걸 최우선으로 선택(단, eligible 목록 안에 있어야 함)
      const urlPreferred =
        applicationIdParam && eligibleByStatus.some((x) => x._id === applicationIdParam)
          ? applicationIdParam
          : null;

      // 중복 fetch 제거:
      // - 기존에는 여기서 eligibility를 다시 호출해 suggestedApplicationId를 가져왔지만
      //   상단 "일반 eligibility 검사" effect에서 이미 받아온 값을 재사용합니다.
      const suggestedOk =
        serviceSuggestedAppId && eligibleByStatus.some((x) => x._id === serviceSuggestedAppId)
          ? serviceSuggestedAppId
          : null;

      const initialNextId = urlPreferred ?? suggestedOk ?? eligibleByStatus[0]?._id ?? null;

      if (!aborted) setSelectedAppId(initialNextId);

      // 2차(후순위) 목록 정교화: 이미 서비스 리뷰를 작성한 신청서는 제외
      try {
        const mine = await minePromise;

        if (mine.ok) {
          const mineJson = (await mine.json()) as any;
          const reviewedIdsArr: string[] = (mineJson?.items ?? [])
            .map((it: any) => it?.serviceApplicationId)
            .filter(Boolean)
            .map((v: any) => String(v));

          const nextReviewedMap = reviewedIdsArr.reduce<Record<string, true>>(
            (acc, id: string) => {
              acc[id] = true;
              return acc;
            },
            {} as Record<string, true>,
          );

          setReviewedMap(nextReviewedMap);

          const reviewedIds = new Set(reviewedIdsArr);
          const refinedEligibleApps = eligibleByStatus.filter(
            (x) => !reviewedIds.has(String(x._id)),
          );
          setApps(refinedEligibleApps);

          // 초기 선택값이 후순위 정교화 결과에서 제외됐다면 안전하게 대체 선택
          setSelectedAppId((prev) => {
            if (!prev || refinedEligibleApps.some((x) => x._id === prev)) return prev;
            // mine 정교화 이후에는 "실제로 아직 리뷰 가능한 신청서(refinedEligibleApps)"만 선택해야 안전합니다.
            // URL의 applicationId(urlPreferred)를 무조건 우선하면, 이미 리뷰 완료되어 제외된 ID가 다시 선택될 수 있습니다.
            const refinedUrlPreferred =
              urlPreferred && refinedEligibleApps.some((x) => x._id === urlPreferred)
                ? urlPreferred
                : null;
            const fallbackId =
              refinedUrlPreferred ??
              (serviceSuggestedAppId &&
              refinedEligibleApps.some((x) => x._id === serviceSuggestedAppId)
                ? serviceSuggestedAppId
                : null) ??
              refinedEligibleApps[0]?._id ??
              null;
            return fallbackId;
          });
        } else {
          // mine API 실패 시 맵 초기화(찌꺼기 방지)
          setReviewedMap({});
        }
      } catch {
        // 네트워크/권한 이슈가 있어도 1차 목록(서비스 완료 계열)은 유지
        setReviewedMap({});
      }
    })();

    return () => {
      aborted = true;
    };
  }, [
    mode,
    applicationIdParam,
    serviceSuggestedAppId,
    allowGuestCheckout,
    authChecked,
    blockedByLoginGate,
  ]);

  // 서비스 모드: 신청서 선택 시 그 대상으로 재검사
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    if (mode !== "service" || !selectedAppId) return;
    let aborted = false;
    (async () => {
      setState("loading");
      const r = await fetch(
        `/api/reviews/eligibility?service=stringing&applicationId=${selectedAppId}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      if (aborted) return;
      if (r.status === 401) {
        setState("unauthorized");
        return;
      }
      const d = await r.json();
      setState(d.eligible ? "ok" : (d.reason ?? "error"));
    })();
    return () => {
      aborted = true;
    };
  }, [mode, selectedAppId, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // 토글 기준으로 보여줄 목록
  const shownApps = useMemo(() => (showAllApps ? allApps : apps), [showAllApps, allApps, apps]);

  // 선택된 AppLite 계산 (전체 목록 우선)
  const selectedApp = useMemo(() => {
    if (!selectedAppId) return null;
    return (
      allApps.find((a) => a._id === selectedAppId) ??
      apps.find((a) => a._id === selectedAppId) ??
      null
    );
  }, [allApps, apps, selectedAppId]);

  // 잠금: 서비스 모드에서는 신청서가, 대여 모드에서는 대여 정보가 선택되어 있어야 언락
  const locked =
    state !== "ok" || (mode === "service" && !selectedAppId) || (mode === "rental" && !rentalMeta);

  const badge =
    state === "loading" ? (
      "검증 중…"
    ) : state === "already" ? (
      "이미 작성한 대상입니다"
    ) : state === "serviceLinkedOrder" ? (
      <p className="font-medium">상품·교체서비스 후기 대상입니다.</p>
    ) : state === "notPurchased" ? (
      "아직 후기를 작성할 수 없어요"
    ) : state === "rentalNotFound" ? (
      "대여 내역을 찾을 수 없어요"
    ) : state === "notConfirmed" || state === "invalidStatus" ? (
      "아직 후기를 작성할 수 없어요"
    ) : state === "unauthorized" ? (
      "로그인이 필요합니다"
    ) : state === "invalid" ? (
      "작성할 후기를 찾을 수 없어요"
    ) : state === "error" ? (
      "오류"
    ) : null;

  // 주문 아이템 + 현재 상품 메타 로드
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    let aborted = false;
    // 주문 아이템
    if (resolvedOrderId) {
      (async () => {
        try {
          const r = await fetch(`/api/orders/${resolvedOrderId}/review-items`, {
            credentials: "include",
            cache: "no-store",
          });
          const data = await r.json();
          if (aborted || !data?.ok) return;
          setOrderItems(data.items);
        } catch {}
      })();
    }
    // 현재 상품 mini 메타 (orderId 유무와 무관)
    if (resolvedProductId && mode === "product") {
      (async () => {
        try {
          const r = await fetch(`/api/products/${resolvedProductId}/mini`, {
            cache: "no-store",
          });
          const d = await r.json();
          if (!aborted && d?.ok) {
            // 레이스 컨디션 방지:
            // - /api/products/:id/mini 응답과 /api/orders/:id/review-items 응답이
            //   서로 다른 타이밍으로 도착하면서 setCurrentMeta를 "통째로 덮어쓰기"하면
            //   이름/이미지가 들쑥날쑥해질 수 있음에 따라 항상 "merge" 방식으로 업데이트.
            setCurrentMeta((prev) => {
              const prevName = (prev?.name ?? "").trim();
              const nextName = String(d.name ?? "").trim();

              // prev가 더 구체적이면(prevName) 유지, 아니면 nextName 채택
              const safeName =
                prevName && prevName !== "라켓" && prevName !== "상품" && prevName !== "상품 리뷰"
                  ? prevName
                  : nextName || prevName || "상품";

              const safeImage = prev?.image ?? d.image ?? null;

              return {
                name: safeName,
                image: safeImage,
                kind: (d.kind ?? prev?.kind ?? "product") as any,
                href: (d.href ?? prev?.href ?? `/products/${resolvedProductId}`) as any,
              };
            });
          }
        } catch {}
      })();
    }
    return () => {
      aborted = true;
    };
  }, [mode, resolvedOrderId, resolvedProductId, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // 대여 모드: 대여 대상 메타 로드
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    if (mode !== "rental" || !rentalIdParam) return;
    let aborted = false;
    (async () => {
      try {
        const r = await fetch(`/api/me/rentals/${encodeURIComponent(rentalIdParam)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (aborted) return;
        if (!r.ok) {
          setRentalMeta(null);
          if (r.status === 401) setState("unauthorized");
          else setState("rentalNotFound");
          return;
        }
        const d = await r.json();
        const brand = String(d?.brand ?? "").trim();
        const model = String(d?.model ?? "").trim();
        setRentalMeta({
          id: String(d?.id ?? rentalIdParam),
          name: [brand, model].filter(Boolean).join(" ") || "대여 라켓",
          image: d?.imageUrl ?? d?.racketImageUrl ?? null,
          days: typeof d?.days === "number" ? d.days : null,
          status: d?.status ?? null,
          createdAt: d?.createdAt ?? null,
          dueAt: d?.dueAt ?? null,
          returnedAt: d?.returnedAt ?? null,
        });
      } catch {
        if (!aborted) {
          setRentalMeta(null);
          setState("error");
        }
      }
    })();
    return () => {
      aborted = true;
    };
  }, [mode, rentalIdParam, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // orderItems/현재 상품 변경 때 currentMeta 보정 (주문 스냅샷 우선)
  useEffect(() => {
    if (!resolvedProductId || !orderItems?.length) return;
    const found = orderItems.find((it) => it.productId === resolvedProductId);
    if (!found) return;

    // 주문 스냅샷 우선 정책이더라도,
    // - found.image가 null이거나 found.name이 '라켓' 같은 일반값이면
    //   이미 확보된(미니 메타 등) 더 좋은 값이 덮어써져 버릴 수 있음 그렇기에 "좋은 값은 유지"하는 형태로 merge.
    setCurrentMeta((prev) => {
      const prevName = (prev?.name ?? "").trim();
      const snapName = String(found.name ?? "").trim();

      const isGeneric = snapName === "라켓" || snapName === "상품" || snapName === "상품 리뷰";
      const safeName = !snapName
        ? prevName || "상품"
        : isGeneric &&
            prevName &&
            prevName !== "라켓" &&
            prevName !== "상품" &&
            prevName !== "상품 리뷰"
          ? prevName
          : snapName;

      const safeImage = found.image ?? prev?.image ?? null;
      return {
        name: safeName,
        image: safeImage,
        kind: prev?.kind ?? "product",
        href: prev?.href ?? `/products/${resolvedProductId}`,
      };
    });
  }, [orderItems, resolvedProductId]);

  //상품 전환
  function switchProduct(pid: string) {
    if (!pid || pid === resolvedProductId) return;
    confirmLeaveIfDirty(() => {
      // 대상 상품이 바뀌면 “작성 중인 내용”은 의미가 달라지므로 초기화
      resetForm();
      setResolvedProductId(pid);
      setState("loading");
      const qp = new URLSearchParams();
      qp.set("productId", pid);
      if (resolvedOrderId) qp.set("orderId", resolvedOrderId);
      router.replace(`/reviews/write?${qp.toString()}`);
    });
  }

  // 다음 미작성 상품 계산: 현재 이후 먼저 -> 없으면 앞쪽에서
  const nextUnreviewed = useMemo(() => {
    if (!orderItems?.length || !resolvedProductId) return null;
    const idx = orderItems.findIndex((x) => x.productId === resolvedProductId);
    if (idx === -1) return orderItems.find((x) => !x.reviewed) ?? null;
    const after = orderItems.slice(idx + 1).find((x) => !x.reviewed);
    if (after) return after;
    const before = orderItems.slice(0, idx).find((x) => !x.reviewed);
    return before ?? null;
  }, [orderItems, resolvedProductId]);

  // 남은 미작성 개수
  const remainingCount = useMemo(
    () => orderItems?.filter((x) => !x.reviewed && x.productId !== resolvedProductId).length ?? 0,
    [orderItems, resolvedProductId],
  );

  // 제품 상세/서비스 소개로 이동 (라벨 명확화)
  const goPrimary = () => {
    if (mode === "product" && resolvedProductId) {
      router.replace(currentMeta?.href ?? `/products/${resolvedProductId}`);
    } else if (mode === "service") {
      router.replace("/services");
    } else if (mode === "rental") {
      router.replace(rentalIdParam ? `/mypage/rentals/${rentalIdParam}` : "/mypage?tab=orders&scope=rental");
    } else {
      router.replace("/reviews");
    }
  };

  // 제출
  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (locked) return;
    const payload: any = { rating, content, photos };
    if (mode === "product") {
      if (!resolvedProductId) return;
      payload.productId = resolvedProductId;
      if (resolvedOrderId) payload.orderId = resolvedOrderId;
    } else if (mode === "service") {
      if (!selectedAppId) {
        showInfoToast("대상 신청서를 선택해 주세요.");
        return;
      }
      payload.service = "stringing";
      payload.serviceApplicationId = selectedAppId;
      setIsSubmitting(true);
    } else if (mode === "rental") {
      if (!rentalIdParam) return;
      payload.rentalId = rentalIdParam;
    }
    setIsSubmitting(true);
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        showSuccessToast("후기가 등록되었습니다.");
        if (mode === "product" && resolvedProductId) {
          const href = currentMeta?.href ?? `/products/${resolvedProductId}`;
          const next = currentMeta?.kind === "product" ? `${href}#reviews` : href;
          router.replace(next);
        } else if (mode === "service") {
          router.replace("/reviews?tab=service");
        } else if (mode === "rental") {
          router.replace("/reviews?tab=rental");
        } else {
          router.replace("/reviews");
        }
        return;
      }
      if (r.status === 409) {
        setState("already");
        showInfoToast("이미 이 대상에 대한 리뷰를 작성하셨습니다.");
        return;
      }
      if (r.status === 404) {
        setState("notPurchased");
        showInfoToast("구매/이용 이력이 있어야 리뷰를 작성할 수 있어요.");
        return;
      }
      if (r.status === 403) {
        const data = await r.json().catch(() => null);
        if (data?.message === "serviceLinkedOrder") {
          setState("serviceLinkedOrder");
          showInfoToast(
            "교체서비스가 연결된 주문은 상품과 교체서비스 경험을 하나의 이용 후기로 작성할 수 있습니다.",
          );
          return;
        }
      }
      showErrorToast("리뷰 등록에 실패했습니다.");
    } catch {
      showErrorToast("네트워크 오류로 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetTitle =
    mode === "product"
      ? "상품 후기"
      : mode === "service"
        ? "교체서비스 후기"
        : mode === "rental"
          ? "라켓 대여 후기"
          : "리뷰 대상";
  const selectedStringNames = (selectedApp?.stringItems || [])
    .map((s) => s.name)
    .filter(Boolean)
    .join(", ");
  const reviewPlaceholder =
    mode === "product"
      ? "상품의 사용감과 만족도를 적어주세요."
      : mode === "service"
        ? "상품 사용감과 교체서비스 경험을 함께 적어주세요."
        : mode === "rental"
          ? "대여 라켓의 사용감과 대여 경험을 적어주세요."
          : "상품 사용감, 장착 과정, 서비스 경험을 편하게 적어주세요.";

  // 비회원 차단
  if (!allowGuestCheckout && !authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <PublicPageHero
          eyebrow="리뷰 작성"
          title="후기 작성"
          description="구매·서비스·대여 경험을 다른 사용자에게 공유해 주세요."
        />
        <SiteContainer className="py-6 md:py-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <PublicSurface className="space-y-4">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-28 w-full" />
            </PublicSurface>
            <PublicSurface className="space-y-4">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-11 w-full sm:w-36" />
            </PublicSurface>
          </div>
        </SiteContainer>
      </div>
    );
  }
  if (blockedByLoginGate) {
    return <LoginGate next={nextUrl} variant="default" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicPageHero
        eyebrow="리뷰 작성"
        title="후기 작성"
        description="구매·서비스·대여 경험을 다른 사용자에게 공유해 주세요."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => confirmLeaveIfDirty(() => router.replace("/reviews"))}
              className="w-full sm:w-auto"
            >
              리뷰 목록
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => confirmLeaveIfDirty(() => router.replace("/mypage?tab=orders"))}
              className="w-full sm:w-auto"
            >
              마이페이지
            </Button>
          </>
        }
      />
      <SiteContainer className="py-6 md:py-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <PublicSurface className="space-y-4" padding="md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ui-label font-medium text-muted-foreground">어떤 경험을 남기나요?</p>
                <h2 className="mt-1 break-keep text-ui-card-title-lg font-semibold text-foreground">
                  {targetTitle}
                </h2>
              </div>
              {badge && (
                <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-ui-label font-medium text-foreground">
                  {badge}
                </span>
              )}
            </div>

            {mode === "service" && (
              <section className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="block text-ui-body-sm font-semibold text-foreground">
                      후기 대상 신청서
                    </Label>
                    <p className="mt-1 text-ui-label text-muted-foreground">
                      {showAllApps
                        ? "전체 신청서를 표시합니다. 작성 가능한 항목만 선택할 수 있습니다."
                        : "작성 가능한 신청서만 표시됩니다."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllApps((v) => !v)}
                    className="shrink-0 text-ui-label font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
                  >
                    {showAllApps ? "작성 가능만 보기" : "전체 보기"}
                  </button>
                </div>

                <select
                  className="mt-3 h-10 w-full rounded-xl border border-border bg-card px-3 text-ui-body-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedAppId ?? ""}
                  onChange={(e) => {
                    const nextId = e.target.value || null;
                    if (nextId === selectedAppId) return;
                    confirmLeaveIfDirty(() => {
                      resetForm();
                      setSelectedAppId(nextId);
                    });
                  }}
                  disabled={!shownApps.length}
                >
                  {shownApps.length === 0 && (
                    <option value="">
                      {showAllApps
                        ? "신청서가 없습니다"
                        : allApps.length > 0
                          ? "작성 가능한 신청서가 없습니다"
                          : "작성 가능한 신청서가 없습니다"}
                    </option>
                  )}

                  {shownApps.map((a) => {
                    const isEligible =
                      isServiceReviewSelectableStatus(a.status) && !reviewedMap[a._id];
                    const reason = reviewedMap[a._id]
                      ? "이미 리뷰 작성됨"
                      : !isServiceReviewSelectableStatus(a.status)
                        ? `상태: ${a.status ?? "미정"}`
                        : "";
                    const optDisabled = showAllApps ? !isEligible : false;
                    const optLabel = reason ? `${a.label} (${reason})` : a.label;

                    return (
                      <option key={a._id} value={a._id} disabled={optDisabled}>
                        {optLabel}
                      </option>
                    );
                  })}
                </select>
              </section>
            )}

            {mode === "product" && currentMeta && (
              <div className="flex gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                  {currentMeta.image ? (
                    <NextImage
                      src={currentMeta.image}
                      alt={currentMeta.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-ui-label text-muted-foreground">
                      IMG
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-ui-body-sm font-medium text-foreground">
                    {currentMeta.name}
                  </p>
                  <p className="mt-1 text-ui-label text-muted-foreground">구매확정 완료</p>
                  {resolvedOrderId && (
                    <p className="mt-1 break-all text-ui-label text-muted-foreground">
                      주문번호 {resolvedOrderId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {mode === "service" && selectedApp && (
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ui-body-sm font-medium text-foreground">
                      교체서비스 신청 정보
                    </p>
                    {selectedApp.createdAt && (
                      <p className="mt-1 text-ui-label text-muted-foreground">
                        신청일 {formatKoDateTime(selectedApp.createdAt)}
                      </p>
                    )}
                  </div>
                  {selectedApp.status && <ApplicationStatusBadge status={selectedApp.status} />}
                </div>
                <dl className="mt-3 space-y-2 text-ui-body-sm">
                  {(formatYMD(selectedApp.preferredDate) ||
                    formatHM(selectedApp.preferredTime)) && (
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">예약</dt>
                      <dd className="min-w-0 break-words text-right text-foreground">
                        {[formatYMD(selectedApp.preferredDate), formatHM(selectedApp.preferredTime)]
                          .filter(Boolean)
                          .join(" ")}
                      </dd>
                    </div>
                  )}
                  {selectedApp.racketType && (
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">라켓</dt>
                      <dd className="min-w-0 break-words text-right text-foreground">
                        {selectedApp.racketType}
                      </dd>
                    </div>
                  )}
                  {selectedStringNames && (
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">스트링</dt>
                      <dd className="min-w-0 break-words text-right text-foreground">
                        {selectedStringNames}
                      </dd>
                    </div>
                  )}
                  {selectedApp.requirements && (
                    <div className="border-t border-border pt-2">
                      <dt className="text-muted-foreground">요청사항</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-foreground">
                        {selectedApp.requirements}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-3 break-all text-ui-label text-muted-foreground">
                  신청번호 {selectedApp._id}
                </p>
              </div>
            )}

            {mode === "rental" && rentalMeta && (
              <div className="flex gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                  {rentalMeta.image ? (
                    <NextImage
                      src={rentalMeta.image}
                      alt={rentalMeta.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-ui-label text-muted-foreground">
                      IMG
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-ui-body-sm font-medium text-foreground">
                    {rentalMeta.name}
                  </p>
                  <p className="mt-1 text-ui-label text-muted-foreground">
                    {[rentalMeta.days ? `${rentalMeta.days}일 대여` : null, rentalMeta.status ? `상태 ${rentalMeta.status}` : null]
                      .filter(Boolean)
                      .join(" · ") || "라켓 대여"}
                  </p>
                  {(rentalMeta.createdAt || rentalMeta.dueAt || rentalMeta.returnedAt) && (
                    <p className="mt-1 text-ui-label text-muted-foreground">
                      {[rentalMeta.createdAt ? `신청 ${formatKoDate(rentalMeta.createdAt)}` : null, rentalMeta.dueAt ? `반납예정 ${formatKoDate(rentalMeta.dueAt)}` : null, rentalMeta.returnedAt ? `반납완료 ${formatKoDate(rentalMeta.returnedAt)}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="mt-1 break-all text-ui-label text-muted-foreground">
                    대여번호 {rentalMeta.id}
                  </p>
                </div>
              </div>
            )}

            {mode === "product" && orderItems && orderItems.length > 1 && (
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3 text-ui-body-sm">
                  <span className="font-medium text-foreground">이 주문의 다른 상품</span>
                  <span className="text-ui-label text-muted-foreground">
                    미작성 {remainingCount}개
                  </span>
                </div>
                <div className="space-y-2">
                  {orderItems.map((it) => {
                    const isCurrent = it.productId === resolvedProductId;
                    const statusText = it.reviewed ? "완료" : isCurrent ? "작성중" : "미작성";
                    return (
                      <div
                        key={it.productId}
                        className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
                      >
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {it.image ? (
                            <NextImage
                              src={it.image}
                              alt={it.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-ui-micro text-muted-foreground">
                              IMG
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 break-words text-ui-label font-medium text-foreground">
                            {it.name}
                          </p>
                          <p className="text-ui-caption text-muted-foreground">{statusText}</p>
                        </div>
                        {!isCurrent && !it.reviewed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => switchProduct(it.productId)}
                            className="h-8 shrink-0 px-2 text-ui-label"
                          >
                            작성
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </PublicSurface>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <SummaryCard
            title="후기를 남겨주세요"
            description="별점, 이용 경험, 사진을 입력해 후기를 등록해 주세요."
          >
            <form onSubmit={onSubmit} className="space-y-6">
              {state !== "ok" && (mode !== "invalid" || state === "serviceLinkedOrder") && (
                <ResultState
                  status={state === "error" || state === "unauthorized" ? "error" : "info"}
                  title="후기 작성 상태를 확인해 주세요"
                  description={
                    state === "loading" ? "작성 가능 여부를 확인하고 있습니다." : undefined
                  }
                  className="rounded-2xl border border-border bg-muted/30 px-4 py-8"
                >
                  {state === "notPurchased" && (
                    <div className="space-y-2">
                      <p className="font-medium">작성 가능한 이용 내역이 없습니다.</p>
                      <p className="text-muted-foreground">
                        구매확정 또는 수령확인이 완료된 내역에서 후기를 작성할 수 있습니다.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          confirmLeaveIfDirty(() => {
                            router.replace("/mypage?tab=orders");
                          })
                        }
                        className="font-medium underline underline-offset-4"
                      >
                        마이페이지에서 확인
                      </button>
                    </div>
                  )}
                  {state === "already" && (
                    <div className="space-y-1">
                      <p className="font-medium">이미 이용 후기를 남겼어요.</p>
                      <p className="text-muted-foreground">
                        하나의 이용 내역에는 하나의 후기만 작성할 수 있습니다.
                      </p>
                    </div>
                  )}
                  {state === "serviceLinkedOrder" && (
                    <div className="space-y-1">
                      <p className="font-medium">상품·교체서비스 후기 대상입니다.</p>
                      <p className="text-muted-foreground">
                        연결된 교체서비스 수령확인 후 상품과 서비스 경험을 함께 남겨주세요.
                      </p>
                    </div>
                  )}
                  {(state === "rentalNotFound" || state === "notConfirmed" || state === "invalidStatus") && (
                    <div className="space-y-1">
                      <p className="font-medium">라켓 대여 후기를 작성할 수 없는 상태입니다.</p>
                      <p className="text-muted-foreground">
                        반납 완료 또는 반납 확정이 끝난 대여 내역에서 후기를 작성할 수 있습니다.
                      </p>
                    </div>
                  )}
                  {state === "unauthorized" && "로그인이 필요합니다."}
                  {state === "error" && "접근 확인 중 문제가 발생했어요."}
                </ResultState>
              )}

              {mode === "invalid" && state !== "serviceLinkedOrder" && (
                <EmptyState
                  title="작성할 후기를 찾을 수 없어요"
                  description="구매확정 또는 수령확인이 완료된 내역에서 후기를 작성할 수 있습니다."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        confirmLeaveIfDirty(() => router.replace("/mypage?tab=orders"))
                      }
                      className="w-full sm:w-auto"
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
                <div className="rounded-2xl border border-border bg-muted/20 px-4 py-5 shadow-sm">
                  <Stars value={rating} onChange={setRating} disabled={locked} />
                  <div className="mt-3 text-center text-ui-body-sm font-medium text-foreground">
                    {rating}점
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <Label className="text-ui-body-lg font-semibold text-foreground">후기 내용</Label>
                  <span className="text-ui-label text-muted-foreground tabular-nums">
                    {content.length} / 1000자
                  </span>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={reviewPlaceholder}
                  className="min-h-[180px] resize-y rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={locked}
                />
              </section>

              <section className="space-y-3">
                <div>
                  <Label className="text-ui-body-lg font-semibold text-foreground">사진 첨부</Label>
                  <p className="mt-1 text-ui-body-sm text-muted-foreground">
                    선택 사항이며 최대 5장까지 등록할 수 있습니다.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-background p-4">
                  <PhotosUploader
                    value={photos}
                    onChange={setPhotos}
                    max={5}
                    onUploadingChange={setIsUploading}
                    previewMode="queue"
                  />
                  <PhotosReorderGrid
                    value={photos}
                    onChange={setPhotos}
                    disabled={locked || isUploading}
                  />
                  {isUploading && (
                    <div className="mt-2 text-ui-label text-muted-foreground">
                      이미지 업로드 중...
                    </div>
                  )}
                </div>
              </section>

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => confirmLeaveIfDirty(goPrimary)}
                  className="h-11 w-full overflow-hidden whitespace-nowrap rounded-xl bg-transparent sm:w-auto"
                >
                  {mode === "product"
                    ? "상품 상세"
                    : mode === "service"
                      ? "서비스 소개"
                      : mode === "rental"
                        ? "대여 내역 보기"
                        : "리뷰 목록"}
                </Button>
                <Button
                  data-cy="submit-review"
                  type="submit"
                  disabled={locked || isUploading}
                  aria-disabled={locked || isUploading}
                  className="h-11 w-full overflow-hidden whitespace-nowrap rounded-xl font-semibold sm:w-auto"
                >
                  {isUploading ? "이미지 업로드 중..." : "리뷰 등록"}
                </Button>
              </div>
            </form>
          </SummaryCard>
          <PublicSurface className="space-y-2 lg:sticky lg:top-24" padding="md">
            <h2 className="text-ui-body-sm font-semibold text-foreground">등록 전 확인</h2>
            <ul className="space-y-1 text-ui-body-sm text-muted-foreground">
              <li>• 실제 사용 경험을 중심으로 작성해주세요.</li>
              <li>• 사진은 선택 사항이며 최대 5장까지 등록됩니다.</li>
              <li>• 하나의 이용 내역에는 하나의 후기만 작성할 수 있습니다.</li>
            </ul>
          </PublicSurface>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
