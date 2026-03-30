"use client";

import { useEffect, useMemo, useState } from "react";

import { collectionMethodLabel } from "@/app/features/stringing-applications/lib/fulfillment-labels";
import useStringingApplySharedState from "@/app/features/stringing-applications/hooks/useStringingApplySharedState";
import {
  resolvePackageUsage,
  resolveRequiredPassCountFromInput,
} from "@/app/features/stringing-applications/lib/package-pricing";
import { useReservedSlots } from "@/app/services/apply/_hooks/useReservedSlots";
import type { CartItem } from "@/app/store/cartStore";

type ServicePickup = "SELF_SEND" | "COURIER_VISIT" | "SHOP_VISIT";

type Params = {
  withStringService: boolean;
  orderItems: CartItem[];
  mountingFeeByProductId: Record<string, number>;
  serviceTargetIds: string[];

  name: string;
  email: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  depositor: string;
  selectedBank: string;
  servicePickupMethod: ServicePickup;
  isMember: boolean;
};

const PREVIEW_ORDER_ID = "__checkout_preview_order__";

const mapPickupToCollectionMethod = (pickup: ServicePickup) => {
  if (pickup === "SHOP_VISIT") return "visit" as const;
  if (pickup === "COURIER_VISIT") return "courier_pickup" as const;
  return "self_ship" as const;
};

const sameStringArray = (a: string[] | undefined, b: string[] | undefined) => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }

  return true;
};

const sameCountMap = (
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
) => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }

  return true;
};

// 시간 문자열("10:30")을 분 단위로 바꿔서
// 슬롯 간격(예: 30분) 계산에 사용
const parseTimeToMinutes = (time: string | null | undefined) => {
  if (!time || typeof time !== "string") return null;
  const [h, m] = time.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

export default function useCheckoutStringingServiceAdapter({
  withStringService,
  orderItems,
  mountingFeeByProductId,
  serviceTargetIds,
  name,
  email,
  phone,
  postalCode,
  address,
  addressDetail,
  depositor,
  selectedBank,
  servicePickupMethod,
  isMember,
}: Params) {
  const [packagePreview, setPackagePreview] = useState<{
    has: boolean;
    remaining?: number;
    expiresAt?: string;
    passId?: string;
    packageSize?: number;
  }>({ has: false });

  const previewOrder = useMemo(() => {
    const items = orderItems.map((item) => ({
      id: String(item.id),
      name: item.name,
      kind: item.kind ?? "product",
      quantity: Number(item.quantity ?? 1),
      price: Number(item.price ?? 0),
      mountingFee: mountingFeeByProductId[String(item.id)] ?? 0,
      image: item.image ?? null,
    }));

    return {
      id: PREVIEW_ORDER_ID,
      items,
      stringService: {
        totalSlots: serviceTargetIds.reduce((sum, id) => {
          const found = items.find((it) => it.id === id);
          return sum + Number(found?.quantity ?? 0);
        }, 0),
        usedSlots: 0,
      },
    } as const;
  }, [orderItems, mountingFeeByProductId, serviceTargetIds]);

  const shared = useStringingApplySharedState({
    fromPDP: false,
    orderId: PREVIEW_ORDER_ID,
    rentalId: null,
    order: previewOrder,
    pdpProductId: null,
    pdpProduct: null,
    pdpMountingFee: Number.NaN,
    lockedStringStock: null,
    lockedRacketQuantity: null,
    isRentalBased: false,
  });

  const { setFormData } = shared;

  useEffect(() => {
    if (!withStringService) return;

    (async () => {
      try {
        const res = await fetch("/api/passes/me", { credentials: "include" });
        if (!res.ok) {
          setPackagePreview({ has: false });
          return;
        }

        const data = await res.json();
        const items = (data?.items ?? []).filter(
          (p: any) =>
            p.status === "active" &&
            p.remainingCount > 0 &&
            new Date(p.expiresAt).getTime() >= Date.now(),
        );
        items.sort(
          (a: any, b: any) =>
            new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
        );

        if (items.length === 0) {
          setPackagePreview({ has: false });
          return;
        }

        const pass = items[0];
        setPackagePreview({
          has: true,
          remaining: pass.remainingCount,
          expiresAt: pass.expiresAt,
          passId: pass.id,
          packageSize: pass.packageSize,
        });
      } catch {
        setPackagePreview({ has: false });
      }
    })();
  }, [withStringService]);

  useEffect(() => {
    if (!withStringService) return;

    const collectionMethod = mapPickupToCollectionMethod(servicePickupMethod);
    const isVisit = collectionMethod === "visit";

    setFormData((prev) => {
      if (
        prev.name === name &&
        prev.email === email &&
        prev.phone === phone &&
        prev.shippingName === name &&
        prev.shippingEmail === email &&
        prev.shippingPhone === phone &&
        prev.shippingPostcode === (isVisit ? "" : postalCode) &&
        prev.shippingAddress === (isVisit ? "" : address) &&
        prev.shippingAddressDetail === (isVisit ? "" : addressDetail) &&
        prev.shippingDepositor === depositor &&
        prev.shippingBank === selectedBank &&
        prev.collectionMethod === collectionMethod
      ) {
        return prev;
      }

      return {
        ...prev,
        name,
        email,
        phone,
        shippingName: name,
        shippingEmail: email,
        shippingPhone: phone,
        shippingPostcode: isVisit ? "" : postalCode,
        shippingAddress: isVisit ? "" : address,
        shippingAddressDetail: isVisit ? "" : addressDetail,
        shippingDepositor: depositor,
        shippingBank: selectedBank,
        collectionMethod,
      };
    });
  }, [
    withStringService,
    servicePickupMethod,
    name,
    email,
    phone,
    postalCode,
    address,
    addressDetail,
    depositor,
    selectedBank,
    setFormData,
  ]);

  useEffect(() => {
    if (!withStringService) return;

    const selectedIds = serviceTargetIds.filter(Boolean);
    const nextCounts: Record<string, number> = {};

    selectedIds.forEach((id) => {
      const found = previewOrder.items.find((it) => it.id === id);
      const qty = Number(found?.quantity ?? 1);
      nextCounts[id] = Number.isFinite(qty) && qty > 0 ? qty : 1;
    });

    setFormData((prev) => {
      if (
        sameStringArray(prev.stringTypes, selectedIds) &&
        sameCountMap(prev.stringUseCounts, nextCounts)
      ) {
        return prev;
      }

      return {
        ...prev,
        stringTypes: selectedIds,
        stringUseCounts: nextCounts,
      };
    });
  }, [withStringService, serviceTargetIds, previewOrder.items, setFormData]);

  const orderRemainingSlots =
    (previewOrder.stringService.totalSlots ?? 0) -
    (previewOrder.stringService.usedSlots ?? 0);
  const requiredPassCount = useMemo(
    () =>
      resolveRequiredPassCountFromInput({
        lines: shared.linesForSubmit,
        stringTypes: shared.formData.stringTypes,
      }),
    [shared.linesForSubmit, shared.formData.stringTypes],
  );

  // 예약 가능한 시간 목록을 실제로 조회
  const {
    disabledTimes,
    reservedTimes,
    timeSlots,
    slotsLoading,
    slotsError,
    hasCacheForDate,
  } = useReservedSlots({
    preferredDate: shared.formData.preferredDate,
    preferredTime: shared.formData.preferredTime,
    requiredPassCount,
    setFormData: shared.setFormData,
  });

  // 예약 슬롯 배열에서 간격(예: 30분)을 계산.
  // 예: ["10:00", "10:30", "11:00"] -> 30분
  const slotIntervalMinutes = useMemo(() => {
    if (!timeSlots || timeSlots.length < 2) return null;
    const first = parseTimeToMinutes(timeSlots[0]);
    const second = parseTimeToMinutes(timeSlots[1]);
    if (first == null || second == null) return null;
    const diff = Math.abs(second - first);
    return diff > 0 ? diff : null;
  }, [timeSlots]);

  // 현재 신청 라인 수 = 실제 필요한 작업 슬롯 수와 같은 개념으로 사용
  const visitSlotCountUi = shared.lineCount || 0;
  // 예상 소요 시간 = 슬롯 간격 × 슬롯 수
  const visitDurationMinutesUi = useMemo(() => {
    if (!slotIntervalMinutes || !visitSlotCountUi) return null;
    return slotIntervalMinutes * visitSlotCountUi;
  }, [slotIntervalMinutes, visitSlotCountUi]);

  useEffect(() => {
    // shared 훅 내부 visitTimeRange 계산에 필요한 값을 동기화
    shared.setVisitDurationMinutesUi(visitDurationMinutesUi);
  }, [visitDurationMinutesUi, shared.setVisitDurationMinutesUi]);

  const packageRemaining = Math.max(0, packagePreview?.remaining ?? 0);
  const packageUsage = resolvePackageUsage({
    hasPackage: !!packagePreview?.has,
    packageRemaining,
    requiredPassCount,
    packageOptOut: !!shared.formData.packageOptOut,
  });
  const { canApplyPackage, packageInsufficient, usingPackage } = packageUsage;

  useEffect(() => {
    if (packageInsufficient && !shared.formData.packageOptOut) {
      shared.setFormData((prev) => ({ ...prev, packageOptOut: true }));
    }
  }, [packageInsufficient, shared.formData.packageOptOut, shared.setFormData]);

  const base = shared.linesForSubmit.reduce(
    (sum, line) => sum + Number(line.mountingFee ?? 0),
    0,
  );
  const price = usingPackage ? 0 : base;
  const selectedOrderItem =
    previewOrder.items.find(
      (it) => it.id === shared.formData.stringTypes?.[0],
    ) ?? null;

  const summary = useMemo(() => {
    const collectionLabel = collectionMethodLabel(shared.formData.collectionMethod);
    const lineCount = shared.linesForSubmit.length;
    const stringNames = Array.from(
      new Set(
        shared.linesForSubmit
          .map((line) => String(line.stringName ?? "").trim())
          .filter(Boolean),
      ),
    );
    const tensionSet = Array.from(
      new Set(
        shared.linesForSubmit
          .map((line) => {
            const main = String(line.tensionMain ?? "").trim();
            const cross = String(line.tensionCross ?? "").trim();
            if (!main && !cross) return "";
            return cross && cross !== main ? `${main}/${cross}` : main || cross;
          })
          .filter(Boolean),
      ),
    );

    const reservationLabel =
      shared.formData.collectionMethod === "visit" &&
      shared.formData.preferredDate &&
      shared.formData.preferredTime
        ? `${shared.formData.preferredDate} ${shared.formData.preferredTime}`
        : null;

    const requestRaw = String(shared.formData.requirements ?? "").trim();
    const requestPreview = requestRaw
      ? requestRaw.length > 24
        ? `${requestRaw.slice(0, 24)}…`
        : requestRaw
      : "없음";

    const priceLabel = usingPackage
      ? "패키지 적용(교체비 0원)"
      : `${price.toLocaleString("ko-KR")}원`;

    return {
      collectionLabel,
      lineCount,
      stringNames,
      tensionSummary: tensionSet.length ? tensionSet.join(", ") : "미입력",
      reservationLabel,
      requestPreview,
      priceLabel,
    };
  }, [shared.formData, shared.linesForSubmit, usingPackage, price]);

  const completion = useMemo(() => {
    const totalLineCount = shared.linesForSubmit.length;
    const lineConfiguredCount = shared.linesForSubmit.filter((line) => {
      const hasRacketType = String(line.racketType ?? "").trim().length > 0;
      const hasTension =
        String(line.tensionMain ?? "").trim().length > 0 ||
        String(line.tensionCross ?? "").trim().length > 0;
      return hasRacketType && hasTension;
    }).length;

    const basicConfigured =
      shared.formData.stringTypes.length > 0 && totalLineCount > 0;
    const needsVisitReservation = shared.formData.collectionMethod === "visit";
    const hasReservation =
      !!shared.formData.preferredDate && !!shared.formData.preferredTime;
    const lineDone = totalLineCount > 0 && lineConfiguredCount === totalLineCount;

    const isReadyToSubmit =
      basicConfigured &&
      lineDone &&
      (!needsVisitReservation || hasReservation);

    const statusLabel = isReadyToSubmit
      ? "접수 준비 완료"
      : basicConfigured
        ? "추가 입력 필요"
        : "기본 정보 필요";

    return {
      basicConfigured,
      lineConfiguredCount,
      totalLineCount,
      needsVisitReservation,
      hasReservation,
      statusLabel,
      isReadyToSubmit,
    };
  }, [shared.formData, shared.linesForSubmit]);

  return {
    previewOrder,
    previewOrderId: PREVIEW_ORDER_ID,
    orderRemainingSlots,
    orderStringService: previewOrder.stringService,
    selectedOrderItem,

    isMember,
    packagePreview,
    canApplyPackage,
    packageInsufficient,
    packageRemaining,
    requiredPassCount,
    usingPackage,

    price,
    priceView: {
      usingPackage,
      base,
      pickupFee: 0,
      total: price,
    },

    // MountingInfoSection으로 내려줄 예약 슬롯 관련 값들
    timeSlots,
    disabledTimes,
    reservedTimes,
    slotsLoading,
    hasCacheForDate,
    slotsError,
    visitSlotCountUi,
    visitDurationMinutesUi,

    summary,
    completion,

    ...shared,
  };
}
