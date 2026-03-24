"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import {
  badgeBase,
  badgeSizeSm,
  getOrderStatusBadgeSpec,
} from "@/lib/badge-style";
import { getOrderStatusLabelForDisplay } from "@/lib/order-shipping";
import { getCommonOrderStatusLabel } from "@/lib/status-labels/base";
import { cn } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

// NOTE:
// 마이페이지 주문 상세에서 사용하는 상태 배지.
// 상태 한글 매핑은 공용 기본 레이어(getCommonOrderStatusLabel)에서 처리하고,
// 방문 수령 문구 치환은 getOrderStatusLabelForDisplay에서 유지합니다.

type Props = {
  orderId: string;
  initialStatus: string;
  shippingMethod?: any;
};

export function OrderStatusBadge({
  orderId,
  initialStatus,
  shippingMethod,
}: Props) {
  const { data } = useSWR<{ status: string }>(
    `/api/orders/${orderId}/status`,
    fetcher,
    {
      fallbackData: { status: initialStatus },
      revalidateOnMount: true, //  mount 될 때 강제 fetch
      revalidateOnFocus: false, // 탭 전환 시 re-fetch 방지
      dedupingInterval: 3000, // 동일 요청 최소 간격 3초
    },
  );

  const normalized = String(data?.status ?? initialStatus ?? "").trim();
  const baseLabel = getCommonOrderStatusLabel(normalized) ?? normalized;
  const displayLabel = baseLabel
    ? getOrderStatusLabelForDisplay(baseLabel, shippingMethod)
    : "배송준비중";

  const spec = getOrderStatusBadgeSpec(data?.status);
  return (
    <Badge variant={spec.variant} className={cn(badgeBase, badgeSizeSm)}>
      {displayLabel}
    </Badge>
  );
}
