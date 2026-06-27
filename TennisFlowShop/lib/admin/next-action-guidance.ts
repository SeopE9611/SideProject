import type { OpsKind } from "@/lib/admin-ops-taxonomy";
import { isVisitPickupOrder } from "@/lib/order-shipping";

export type OpsLikeItem = {
  kind: OpsKind;
  statusLabel?: string | null;
  statusDisplayLabel?: string | null;
  paymentLabel?: string | null;
  nextAction?: string | null;
  flow?: number | null;
  related?: {
    kind: OpsKind;
    id: string;
    href: string;
  } | null;
  hasShippingInfo?: boolean;
  hasOutboundTracking?: boolean;
  hasInboundTracking?: boolean;
  rentalDueAt?: string | null;
  depositRefundedAt?: string | null;
  linkedApplicationStatus?: string | null;
  shippingMethod?: string | null;
  cancelStatus?: "none" | "requested" | "approved" | "rejected" | null;
  cancelRequested?: boolean;
  refundAccountReady?: boolean;
  cancel?: {
    status?: "none" | "requested" | "approved" | "rejected" | null;
    refundAccountReady?: boolean;
  } | null;
};

export type NextActionGuide = {
  stage: string;
  nextAction: string;
};

const doneLike = (v?: string | null) => {
  const s = String(v ?? "").toLowerCase();
  return ["완료", "paid", "결제완료", "교체완료", "반납완료", "returned", "delivered"].some((k) =>
    s.includes(k.toLowerCase()),
  );
};

const isRentalPending = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s === "pending" || s.includes("대기");
};
const isRentalPaid = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s === "paid" || s.includes("결제완료");
};
const isRentalReturned = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s === "returned" || s.includes("반납완료");
};
const isRentalOut = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s === "out" || s.includes("대여중");
};

const isAppWaiting = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s.includes("검토") || s.includes("접수완료");
};
const isAppWorking = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s.includes("작업 중");
};
const isAppDone = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s.includes("교체완료") || s === "완료";
};

const isRentalDueSoon = (dueAt?: string | null) => {
  if (!dueAt) return null;
  const dueTime = new Date(dueAt).getTime();
  if (!Number.isFinite(dueTime)) return null;
  return dueTime <= Date.now() + 48 * 60 * 60 * 1000;
};

const hasIncludedPaymentContext = (paymentLabel?: string | null) => {
  const s = String(paymentLabel ?? "").toLowerCase();
  return s.includes("패키지차감") || s.includes("주문결제포함") || s.includes("대여결제포함");
};

const isOrderShipped = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s.includes("배송중") || s === "shipped";
};

// 배송완료는 "구매확정 직전" 단계로 보고, 운영센터에서 후속 모니터링 대상으로 둡니다.
const isOrderDelivered = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s.includes("배송완료") || s === "delivered";
};

// 구매확정은 주문 플로우가 사실상 종료된 상태로 보고,
// 운영센터 KPI의 "미처리" 건으로 잡히지 않게 별도 분리합니다.
const isOrderConfirmed = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return s.includes("구매확정") || s === "confirmed";
};

const isApplicationClosed = (status?: string | null) => {
  const st = String(status ?? "").toLowerCase();
  return st.includes("취소") || st === "canceled" || st === "cancelled";
};

const isRentalClosed = (status?: string | null) => {
  const st = String(status ?? "").toLowerCase();
  return st.includes("취소") || st === "canceled" || st === "cancelled";
};

const isOrderClosed = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  return (
    s.includes("환불") ||
    s.includes("취소") ||
    s.includes("결제취소") ||
    s === "refunded" ||
    s === "cancelled" ||
    s === "canceled"
  );
};

const isVisitPickupItem = (item: OpsLikeItem) => {
  if (isVisitPickupOrder(item.shippingMethod)) return true;

  const display = String(item.statusDisplayLabel ?? "").toLowerCase();
  // API에서 배송 상태를 방문 수령 문맥으로 치환해 내려온 경우(예: 수령 준비중/방문 수령 완료)
  // shippingMethod가 누락돼도 운영센터 문맥을 방문 수령으로 유지한다.
  return (
    display.includes("방문 수령") || display.includes("수령 준비") || display.includes("방문수령")
  );
};

function isCancelRequested(item: OpsLikeItem) {
  if (item.cancelRequested) return true;
  const status = getEffectiveCancelStatus(item);
  return status === "requested";
}

function getEffectiveCancelStatus(item: OpsLikeItem) {
  return item.cancel?.status ?? item.cancelStatus;
}

function getEffectiveRefundAccountReady(item: OpsLikeItem) {
  if (typeof item.cancel?.refundAccountReady === "boolean") return item.cancel.refundAccountReady;
  if (typeof item.refundAccountReady === "boolean") return item.refundAccountReady;
  return false;
}

function isTerminalOpsItem(item: OpsLikeItem) {
  const cancelStatus = getEffectiveCancelStatus(item);
  if (cancelStatus === "approved") return true;
  if (item.kind === "order") return isOrderClosed(item.statusLabel) || isOrderConfirmed(item.statusLabel);
  if (item.kind === "stringing_application") return isApplicationClosed(item.statusLabel) || isAppDone(item.statusLabel);
  if (item.kind === "rental") {
    if (isRentalClosed(item.statusLabel)) return true;
    if (isRentalReturned(item.statusLabel)) return !item.nextAction?.includes("보증금");
    return false;
  }
  if (item.kind === "package_purchase") return doneLike(item.paymentLabel) || doneLike(item.statusLabel) || String(item.statusLabel ?? "").includes("활성");
  return false;
}

function terminalGuide(item?: OpsLikeItem | null): NextActionGuide {
  if (item?.kind === "order" || item?.kind === "rental") {
    return {
      stage: "통합 운영 종료 단계",
      nextAction: "대표 주문/대여가 종료되어 후속 조치 없음",
    };
  }

  return {
    stage: item?.kind === "stringing_application" ? "신청 종료 단계" : "운영 종료 단계",
    nextAction: "후속 조치 없음",
  };
}

function inferStandaloneOrderGuide(item: OpsLikeItem): NextActionGuide {
  const isVisitPickup = isVisitPickupItem(item);

  if (isOrderClosed(item.statusLabel)) {
    return { stage: "주문 종료 단계", nextAction: "후속 조치 없음" };
  }

  // 구매확정은 배송완료 이후의 최종 확정 상태이므로
  // 운영센터에서 별도 액션 대상으로 보지 않습니다.
  if (isOrderConfirmed(item.statusLabel)) {
    return {
      stage: isVisitPickup ? "방문 수령 확정 완료 단계" : "주문 확정 완료 단계",
      nextAction: "후속 조치 없음",
    };
  }

  if (!doneLike(item.paymentLabel)) {
    return { stage: "주문 결제 확인 단계", nextAction: "주문 결제 확인 필요" };
  }

  // 배송완료는 아직 구매확정/환불 가능성이 남아 있으므로 모니터링 대상으로 유지합니다.
  if (isOrderDelivered(item.statusLabel)) {
    return {
      stage: isVisitPickup ? "방문 수령 완료 단계" : "배송 완료 단계",
      nextAction: "구매확정/환불 요청 여부 모니터링",
    };
  }

  if (isOrderShipped(item.statusLabel)) {
    return {
      stage: isVisitPickup ? "방문 수령 준비 단계" : "배송 진행 단계",
      nextAction: isVisitPickup
        ? "방문 수령 완료 처리 필요"
        : "배송 완료 전 운송장/수령 상태 확인 필요",
    };
  }

  if (!item.hasShippingInfo && !isVisitPickup) {
    return { stage: "배송 준비 단계", nextAction: "배송 정보 등록 필요" };
  }

  if (isVisitPickup) {
    return {
      stage: "방문 수령 준비 단계",
      nextAction: "매장 방문 수령 준비 상태 확인 필요",
    };
  }

  return { stage: "배송 준비 단계", nextAction: "배송중 처리 필요" };
}

export function inferNextActionForOperationItem(item: OpsLikeItem): NextActionGuide {
  if (isCancelRequested(item)) {
    if (getEffectiveRefundAccountReady(item)) {
      return {
        stage: "취소 요청 처리 단계",
        nextAction: "취소승인/취소거절 검토 필요",
      };
    }
    return { stage: "취소 요청 처리 단계", nextAction: "환불 계좌 확인 필요" };
  }

  if (item.kind === "package_purchase") {
    if (!doneLike(item.paymentLabel)) {
      return {
        stage: "패키지 결제 확인 단계",
        nextAction: "패키지 구매 결제 상태와 이용권 활성화 상태를 확인하세요.",
      };
    }

    return {
      stage: "패키지 활성화 완료 단계",
      nextAction: "후속 조치 없음",
    };
  }

  if (item.kind === "rental") {
    if (isRentalReturned(item.statusLabel)) {
      return {
        stage: "대여 반납 완료 단계",
        nextAction: item.depositRefundedAt ? "후속 조치 없음" : "보증금 환급 확인 필요",
      };
    }
    if (isRentalPending(item.statusLabel) || !doneLike(item.paymentLabel)) {
      return {
        stage: "대여 결제 확인 단계",
        nextAction: "대여 결제 확인 필요",
      };
    }
    if (isRentalPaid(item.statusLabel) && !isRentalOut(item.statusLabel)) {
      if (item.linkedApplicationStatus && !isAppDone(item.linkedApplicationStatus)) {
        return {
          stage: "교체 작업 단계",
          nextAction: "교체 작업 단계 변경 필요",
        };
      }
      if (!item.hasOutboundTracking) {
        return { stage: "인도 준비 단계", nextAction: "인도 운송장 등록 필요" };
      }
      return {
        stage: "수령 확인 대기 단계",
        nextAction: "수령 확인 / 대여 시작 필요",
      };
    }
    if (isRentalOut(item.statusLabel)) {
      const dueSoon = isRentalDueSoon(item.rentalDueAt);
      if (dueSoon === false) {
        return { stage: "대여 진행 단계", nextAction: "후속 조치 없음" };
      }
      return {
        stage: dueSoon ? "반납 확인 단계" : "대여 일정 확인 단계",
        nextAction: dueSoon
          ? "반납 예정일이 임박했거나 지났습니다. 반납 확인 필요"
          : "반납 예정일 확인 필요",
      };
    }
  }

  if (item.kind === "stringing_application") {
    if (hasIncludedPaymentContext(item.paymentLabel) && isAppWaiting(item.statusLabel)) {
      return {
        stage: "통합 주문 단계 확인",
        nextAction: "통합 주문의 현재 단계 확인 필요",
      };
    }
    if (isAppWaiting(item.statusLabel)) {
      return {
        stage: "신청서 접수/검토 단계",
        nextAction: "교체 작업 시작 처리 필요",
      };
    }
    if (isAppWorking(item.statusLabel)) {
      return {
        stage: "작업 진행 단계",
        nextAction: "작업 완료 후 교체 완료 처리 필요",
      };
    }
    if (isAppDone(item.statusLabel)) {
      return { stage: "교체 완료 단계", nextAction: "후속 조치 없음" };
    }
  }

  if (item.kind === "order") {
    if (isOrderClosed(item.statusLabel) || isOrderConfirmed(item.statusLabel)) {
      return inferStandaloneOrderGuide(item);
    }
    if (item.related?.kind === "stringing_application") {
      if (!doneLike(item.paymentLabel)) {
        return {
          stage: "주문 결제 확인 단계",
          nextAction: "주문 결제 확인 후 교체 작업 시작 가능 여부 확인 필요",
        };
      }
      return {
        stage: "주문 후속 처리 단계",
        nextAction: "수령/배송 상태와 교체 작업 단계를 확인하세요",
      };
    }
    return inferStandaloneOrderGuide(item);
  }

  return {
    stage: "운영 점검 단계",
    nextAction: "연결 문서 상태를 확인해 다음 처리 대상을 결정하세요",
  };
}

export function inferNextActionForOperationGroup(items: OpsLikeItem[]): NextActionGuide {
  if (items.length > 0 && items.every(isTerminalOpsItem)) {
    return terminalGuide(items[0]);
  }

  const order = items.find((it) => it.kind === "order");
  const rental = items.find((it) => it.kind === "rental");
  const app = items.find((it) => it.kind === "stringing_application");

  if (order && isTerminalOpsItem(order)) {
    return terminalGuide(order);
  }
  if (rental && isTerminalOpsItem(rental)) {
    return terminalGuide(rental);
  }

  const requestedCancels = items.filter((it) => isCancelRequested(it));
  if (requestedCancels.length > 0) {
    const hasRefundAccountPending = requestedCancels.some(
      (it) => !getEffectiveRefundAccountReady(it),
    );
    if (hasRefundAccountPending) {
      return {
        stage: "취소 요청 처리 단계",
        nextAction: "환불 계좌 확인 필요",
      };
    }
    return {
      stage: "취소 요청 처리 단계",
      nextAction: "취소승인/취소거절 검토 필요",
    };
  }

  if (order && app) {
    if (!doneLike(order.paymentLabel)) {
      return {
        stage: "통합 주문 · 결제 확인 단계",
        nextAction: "주문 결제 확인 후 교체 작업 시작 가능 여부 확인 필요",
      };
    }
    if (isAppWaiting(app.statusLabel)) {
      return {
        stage: "통합 주문 · 교체 작업 접수 단계",
        nextAction: "교체 작업 시작 처리 필요",
      };
    }
    if (isAppWorking(app.statusLabel)) {
      return {
        stage: "통합 주문 · 교체 작업 단계",
        nextAction: "작업 완료 후 교체 완료 처리 필요",
      };
    }
  }

  if (order && !app) {
    return inferStandaloneOrderGuide(order);
  }

  if (rental && app) {
    if (isRentalPending(rental.statusLabel) || !doneLike(rental.paymentLabel)) {
      return {
        stage: "대여+교체 · 결제 확인 단계",
        nextAction: "대여 결제 확인 필요",
      };
    }
    if (isAppWaiting(app.statusLabel)) {
      return {
        stage: "대여+교체 · 교체 작업 접수 단계",
        nextAction: "교체 작업 시작 처리 필요",
      };
    }
    if (!isAppDone(app.statusLabel)) {
      return {
        stage: "대여+교체 · 교체 작업 단계",
        nextAction: "교체 작업 단계 변경 필요",
      };
    }
    if (
      isRentalPaid(rental.statusLabel) &&
      !isRentalOut(rental.statusLabel) &&
      !rental.hasOutboundTracking
    ) {
      return {
        stage: "대여+교체 · 인도 준비 단계",
        nextAction: "대여 라켓 인도 정보 등록 필요",
      };
    }
    if (
      isAppDone(app.statusLabel) &&
      isRentalPaid(rental.statusLabel) &&
      !isRentalOut(rental.statusLabel)
    ) {
      return {
        stage: "대여+교체 · 인도 대기 단계",
        nextAction: "사용자가 수령하면 대여 시작 처리 필요",
      };
    }
  }

  if (rental && isRentalOut(rental.statusLabel)) return inferNextActionForOperationItem(rental);
  if (app) return inferNextActionForOperationItem(app);
  if (rental) return inferNextActionForOperationItem(rental);
  return inferNextActionForOperationItem(items[0] ?? { kind: "order" });
}
