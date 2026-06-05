export const CUSTOM_STRING_MOUNTING_FEE = 12_000;
export const COURIER_PICKUP_FEE = 3_000;

export const STRINGING_POLICY_TEXT = {
  custom: `보유/커스텀 스트링 장착비 ${CUSTOM_STRING_MOUNTING_FEE.toLocaleString("ko-KR")}원`,
  product:
    "스트링 상품 선택 시 최종 교체비는 선택 상품과 신청 방식에 따라 안내됩니다.",
  package: "패키지 적용 시 교체비가 무료입니다.",
  dynamic:
    "최종 금액은 선택한 스트링 상품/신청 방식(주문·대여·단독)에 따라 달라질 수 있습니다.",
} as const;
