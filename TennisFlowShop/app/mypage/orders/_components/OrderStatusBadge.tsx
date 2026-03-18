"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import {
  badgeBase,
  badgeSizeSm,
  getOrderStatusBadgeSpec,
} from "@/lib/badge-style";
import { getOrderStatusLabelForDisplay } from "@/lib/order-shipping";
import { cn } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

// NOTE:
// 현재 마이페이지 주문 화면은 `app/features/orders/components/OrderStatusBadge` 공용 컴포넌트를 사용 중입니다.
// 이 파일은 레거시 호환 목적으로 유지하며, 추후 정리 대상임을 명시합니다.

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

  const spec = getOrderStatusBadgeSpec(data?.status);
  return (
    <Badge variant={spec.variant} className={cn(badgeBase, badgeSizeSm)}>
      {getOrderStatusLabelForDisplay(
        data?.status ?? initialStatus,
        shippingMethod,
      )}
    </Badge>
  );
}
