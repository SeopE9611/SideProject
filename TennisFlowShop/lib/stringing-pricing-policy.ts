export const CUSTOM_STRING_MOUNTING_FEE = 15_000;
export const COURIER_PICKUP_FEE = 3_000;

export const STRINGING_POLICY_TEXT = {
  custom: `보유/커스텀 스트링 장착비 ${CUSTOM_STRING_MOUNTING_FEE.toLocaleString("ko-KR")}원`,
  product: "스트링 상품 선택 시 상품별 장착비 기준",
  package: "패키지 적용 시 교체비 0원 처리",
  courier: `기사 방문 수거비 ${COURIER_PICKUP_FEE.toLocaleString("ko-KR")}원(후정산)`,
  dynamic:
    "최종 금액은 선택한 스트링 상품/신청 방식(주문·대여·단독)에 따라 달라질 수 있습니다.",
} as const;
