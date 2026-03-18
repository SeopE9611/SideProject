"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOrderStatusLabelForDisplay,
  isVisitPickupOrder,
} from "@/lib/order-shipping";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import useSWR, { mutate } from "swr";
import useSWRInfinite from "swr/infinite";

const LIMIT = 5; // 한 페이지에 보여줄 이력 개수

// fetcher 함수: API 호출 후 JSON 파싱
const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

// 이력 API 키 생성기: 이전 페이지가 비었으면 더 이상 요청하지 않음
const getHistoryKey =
  (orderId: string) =>
  (pageIndex: number, previousPageData: { history: any[] } | null) => {
    if (previousPageData && previousPageData.history.length === 0) return null;
    return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
  };

// 서버로부터 받는 상태 정보 타입
interface StatusRes {
  status: string;
}
interface Props {
  orderId: string; // 대상 주문 ID
  currentStatus: string; // 서버에서 내려준 현재 상태(초깃값)
  shippingMethod?: string;
}

export default function OrderStatusSelect({
  orderId,
  currentStatus,
  shippingMethod,
}: Props) {
  // 상태 전용 SWR: fallbackData로 초기 상태 주입 -> 첫 렌더 안정화
  const { data: statusData, mutate: mutateStatus } = useSWR<StatusRes>(
    `/api/orders/${orderId}/status`,
    fetcher,
    { fallbackData: { status: currentStatus } },
  );

  // 주문 상세/이력/목록 revalidate를 위한 SWR 핸들들
  const { mutate: mutateOrderDetail } = useSWR(
    `/api/orders/${orderId}`,
    fetcher,
  );
  const { mutate: mutateHistory } = useSWRInfinite(
    getHistoryKey(orderId),
    fetcher,
  );

  // 현재 상태(취소여부 판정에 사용)
  const current = statusData?.status ?? currentStatus;
  const isCancelled = current === "취소";
  const isConfirmed = current === "구매확정";
  const isLocked = isCancelled || isConfirmed;
  const isVisitPickup = isVisitPickupOrder(shippingMethod);

  // 셀렉트에 노출할 “일반 상태”만 남김 (‘취소’는 모달 전용이므로 제외)
  const SELECTABLE_STATUSES = [
    "대기중",
    "결제완료",
    "배송중",
    "배송완료",
    "환불",
  ] as const;

  // 셀렉트 변경 핸들러
  const handleChange = async (nextStatus: string) => {
    try {
      // 동일 값이면 네트워크 호출 불필요 -> 바로 리턴
      if (nextStatus === current) return;

      // 안전장치: 혹시라도 ‘취소’가 들어오면 무시하고 모달 버튼을 쓰게 유도
      if (nextStatus === "취소") return;

      // PATCH 호출(쿠키 인증 포함)
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // access/refresh 쿠키를 서버가 읽을 수 있게
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "변경 실패"));

      // 성공 후, 연관 캐시 순서대로 재검증
      await mutateStatus();
      await mutateOrderDetail();
      await mutateHistory();
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/orders"),
      );

      const displayStatus = getOrderStatusLabelForDisplay(
        nextStatus,
        shippingMethod,
      );
      showSuccessToast(`주문 상태가 '${displayStatus}'(으)로 변경되었습니다.`);
    } catch (err: any) {
      console.error(err);
      showErrorToast(`상태 변경 실패: ${err?.message || "서버 오류"}`);
    }
  };

  return (
    <div className="w-[200px]">
      {/*
        취소 / 구매확정 상태는 최종 상태로 보고 셀렉트 변경을 막습니다.
        - 취소: 이미 종료된 주문
        - 구매확정: 사용자가 주문 완료를 확정한 상태
      */}
      {isLocked ? (
        <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm italic">
          {isConfirmed ? "구매확정됨 (변경 불가)" : "취소됨 (변경 불가)"}
        </div>
      ) : (
        <Select value={current} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="주문 상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {/*  ‘취소’는 제외. 모달 버튼으로만 처리 */}
            {SELECTABLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getOrderStatusLabelForDisplay(s, shippingMethod)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">
        {isVisitPickup
          ? '취소는 수령 전 단계에서만 사용하고, 수령 완료 이후 금전 반환은 상태 "환불"로 처리하세요.'
          : '취소는 배송 전 단계에서만 사용하고, 배송 이후 금전 반환은 상태 "환불"로 처리하세요.'}
      </p>
    </div>
  );
}
