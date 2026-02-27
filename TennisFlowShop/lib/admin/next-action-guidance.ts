export type OpsLikeItem = {
  kind: 'order' | 'stringing_application' | 'rental';
  statusLabel?: string | null;
  paymentLabel?: string | null;
  flow?: number | null;
  related?: { kind: 'order' | 'stringing_application' | 'rental'; id: string; href: string } | null;
  hasShippingInfo?: boolean;
  hasOutboundTracking?: boolean;
  hasInboundTracking?: boolean;
};

export type NextActionGuide = {
  stage: string;
  nextAction: string;
};

const doneLike = (v?: string | null) => {
  const s = String(v ?? '').toLowerCase();
  return ['완료', 'paid', '결제완료', '교체완료', '반납완료', 'returned', 'delivered'].some((k) => s.includes(k.toLowerCase()));
};

const isRentalPending = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s === 'pending' || s.includes('대기');
};
const isRentalPaid = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s === 'paid' || s.includes('결제완료');
};
const isRentalOut = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s === 'out' || s.includes('대여중');
};

const isAppWaiting = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s.includes('검토') || s.includes('접수완료');
};
const isAppWorking = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s.includes('작업 중');
};
const isAppDone = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s.includes('교체완료') || s === '완료';
};

const hasIncludedPaymentContext = (paymentLabel?: string | null) => {
  const s = String(paymentLabel ?? '').toLowerCase();
  return s.includes('패키지차감') || s.includes('주문결제포함') || s.includes('대여결제포함');
};

const isOrderShipped = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s.includes('배송중') || s === 'shipped';
};

const isOrderDeliveredLike = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s.includes('배송완료') || s.includes('구매확정') || s === 'delivered' || s === 'confirmed';
};

const isOrderClosed = (status?: string | null) => {
  const s = String(status ?? '').toLowerCase();
  return s.includes('환불') || s.includes('취소') || s.includes('결제취소') || s === 'refunded' || s === 'cancelled' || s === 'canceled';
};

function inferStandaloneOrderGuide(item: OpsLikeItem): NextActionGuide {
  if (isOrderClosed(item.statusLabel)) {
    return { stage: '주문 종료 단계', nextAction: '후속 조치 없음' };
  }

  if (!doneLike(item.paymentLabel)) {
    return { stage: '주문 결제 확인 단계', nextAction: '주문 결제 확인 필요' };
  }

  if (isOrderDeliveredLike(item.statusLabel)) {
    return { stage: '배송 완료 단계', nextAction: '구매확정/환불 요청 여부 모니터링' };
  }

  if (isOrderShipped(item.statusLabel)) {
    return { stage: '배송 진행 단계', nextAction: '배송 완료 전 운송장/수령 상태 확인 필요' };
  }

  if (!item.hasShippingInfo) {
    return { stage: '배송 준비 단계', nextAction: '배송 정보 등록 필요' };
  }

  return { stage: '배송 준비 단계', nextAction: '배송중 처리 필요' };
}

export function inferNextActionForOperationItem(item: OpsLikeItem): NextActionGuide {
  if (item.kind === 'rental') {
    if (isRentalPending(item.statusLabel) || !doneLike(item.paymentLabel)) {
      return { stage: '대여 결제 확인 단계', nextAction: '대여 결제 확인 필요' };
    }
    if (isRentalPaid(item.statusLabel) && !isRentalOut(item.statusLabel)) {
      if (!item.hasOutboundTracking) {
        return { stage: '출고 준비 단계', nextAction: '출고 정보 등록 필요' };
      }
      return { stage: '출고 준비 단계', nextAction: '사용자 수령 확인 후 대여 시작 처리 필요' };
    }
    if (isRentalOut(item.statusLabel)) {
      return { stage: '대여 진행 단계', nextAction: '반납 일정 및 연결 신청서 상태 확인 필요' };
    }
  }

  if (item.kind === 'stringing_application') {
    if (hasIncludedPaymentContext(item.paymentLabel) && isAppWaiting(item.statusLabel)) {
      return {
        stage: '신청서 결제 문맥 검수 단계',
        nextAction: '결제 문맥(패키지/주문/대여 포함) 확인 후 신청서 작업 상태 확인 필요',
      };
    }
    if (isAppWaiting(item.statusLabel)) {
      return { stage: '신청서 접수/검토 단계', nextAction: '신청서 작업 상태 확인 필요' };
    }
    if (isAppWorking(item.statusLabel)) {
      return { stage: '작업 진행 단계', nextAction: '작업 완료 후 신청서 교체완료 처리 필요' };
    }
    if (isAppDone(item.statusLabel)) {
      return { stage: '교체 완료 단계', nextAction: '연결 문서(주문/대여) 후속 상태 반영 여부 확인 필요' };
    }
  }

  if (item.kind === 'order') {
    if (item.related?.kind === 'stringing_application') {
      if (!doneLike(item.paymentLabel)) {
        return { stage: '주문 결제 확인 단계', nextAction: '주문 결제 확인 및 연결 신청서 진행 가능 여부 확인 필요' };
      }
      return { stage: '주문 후속 처리 단계', nextAction: '배송/수령 상태를 확인하고 연결 신청서 진행 상태를 점검하세요' };
    }
    return inferStandaloneOrderGuide(item);
  }

  return { stage: '운영 점검 단계', nextAction: '연결 문서 상태를 확인해 다음 처리 대상을 결정하세요' };
}

export function inferNextActionForOperationGroup(items: OpsLikeItem[]): NextActionGuide {
  const order = items.find((it) => it.kind === 'order');
  const rental = items.find((it) => it.kind === 'rental');
  const app = items.find((it) => it.kind === 'stringing_application');

  if (order && app) {
    if (!doneLike(order.paymentLabel)) {
      return { stage: '주문+신청 · 결제 확인 단계', nextAction: '주문 결제 확인 및 신청 작업 가능 상태 점검 필요' };
    }
    if (isAppWaiting(app.statusLabel)) {
      return { stage: '주문+신청 · 신청 접수 단계', nextAction: '신청서 작업 상태 확인 필요' };
    }
    if (isAppWorking(app.statusLabel)) {
      return { stage: '주문+신청 · 교체 작업 단계', nextAction: '작업 완료 후 신청서 교체완료 처리 필요' };
    }
  }

  if (order && !app) {
    return inferStandaloneOrderGuide(order);
  }

  if (rental && app) {
    if (isRentalPending(rental.statusLabel) || !doneLike(rental.paymentLabel)) {
      return { stage: 'Flow 7 · 결제 확인 단계', nextAction: '대여 결제 확인 필요' };
    }
    if (isAppWaiting(app.statusLabel)) {
      return { stage: 'Flow 7 · 신청 접수 단계', nextAction: '신청서 작업 상태 확인 필요' };
    }
    if (isRentalPaid(rental.statusLabel) && !isRentalOut(rental.statusLabel) && !rental.hasOutboundTracking) {
      return { stage: 'Flow 7 · 출고 준비 단계', nextAction: '출고 정보 등록 필요' };
    }
    if (isAppWorking(app.statusLabel)) {
      return { stage: 'Flow 7 · 교체 작업 단계', nextAction: '신청서 교체완료 처리 필요' };
    }
    if (isAppDone(app.statusLabel) && isRentalPaid(rental.statusLabel) && !isRentalOut(rental.statusLabel)) {
      return { stage: 'Flow 7 · 인도 대기 단계', nextAction: '사용자가 수령하면 대여 시작 처리 필요' };
    }
  }

  if (app) return inferNextActionForOperationItem(app);
  if (rental) return inferNextActionForOperationItem(rental);
  return inferNextActionForOperationItem(items[0] ?? { kind: 'order' });
}
