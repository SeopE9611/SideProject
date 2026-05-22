# TennisFlowShop 게이지/색상 옵션 회귀 QA 보고서 (2026-05-22)

## 범위
- 게이지/색상 옵션 타입 연계
- 사용자/관리자 주문 및 신청 흐름
- 재고 차감/복구 중복 방지
- UI 표시 일관성 및 레거시 fallback

## 핵심 결론
- 핵심 API 경로(일반 주문/대여 주문/신청서)에서 `selectedGauge` + `selectedColor` 동시 처리, 재고 차감/복구 분기, 중복 복구 방지 플래그는 전반적으로 구현되어 있음.
- 다만 **공유 타입 파일(`lib/types/order.ts`)은 런타임 저장 스키마 대비 일부 필드가 누락**되어 정합성 리스크가 있음.

## 확인된 주요 이슈
1) `lib/types/order.ts`의 `OrderItem` / `Order.meta`에 `selectedColorImage` 누락
2) `lib/types/order.ts`의 `Order.meta`에 재고 타임스탬프(`gaugeStockDeductedAt`, `gaugeStockRestoredAt`, `colorStockDeductedAt`, `colorStockRestoredAt`) 누락

## 권고
- 우선순위 P2로 타입 보강을 권고.
- 런타임 로직 변경 없이 타입 optional 필드 추가만 수행.
