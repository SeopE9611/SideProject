# P3 마무리: status-label 공용화 구조 가이드

## 목적
- 상태 한글 매핑 공용화의 **현재 기준선**을 고정한다.
- direct 연결 확대보다, wrapper 유지 영역/확장 규칙을 명확히 한다.

## 1) 현재 3단 구조 (책임 분리)
1. **기본 매핑 (Layer 1)**
   - 파일: `lib/status-labels/base.ts`
   - 책임: raw status -> 한글 기본 라벨 매핑만 담당.
   - 비책임: 화면별 fallback, 관리자 별칭, 방문 수령 치환.

2. **화면/도메인 wrapper (Layer 2)**
   - 파일:
     - `app/mypage/_lib/status-label.ts`
     - `lib/admin/status-labels.ts`
   - 책임:
     - 화면별 fallback (예: `상태 미정`)
     - 관리자 별칭/호환 표현 정리
     - 혼합 도메인 화면에서의 안전한 라벨 보강

3. **방문 수령 후처리 (Layer 3)**
   - 파일: `lib/order-shipping.ts`
   - 책임: 주문이 방문 수령일 때 화면 문구 후처리
     - 예: `배송중 -> 수령 준비중`, `배송완료 -> 방문 수령 완료`

## 2) direct 연결 가능한 조건
아래를 모두 만족할 때만 `base` direct 사용을 우선 검토한다.
- 도메인이 명확함 (order/payment/application/rental 중 하나 중심)
- wrapper 특수 fallback 의존이 적음
- 방문 수령 치환을 호출부에서 별도 유지 가능 (`getOrderStatusLabelForDisplay`)
- 관리자 별칭/호환 표현이 필요하지 않음

## 3) wrapper 유지가 더 안전한 조건
아래 중 하나라도 해당되면 wrapper 유지를 기본값으로 한다.
- 마이페이지 혼합 피드형 화면
- 관리자 별칭/호환 표현이 필요한 화면
- 여러 도메인 상태가 섞이는 복합 화면
- `상태 미정` 같은 UI fallback 정책이 중요한 화면

## 4) 현재 direct 연결된 사용처
- `app/order-lookup/results/page.tsx`
- `app/order-lookup/details/[id]/page.tsx`
- `app/mypage/orders/_components/OrderStatusBadge.tsx`

## 5) 현재 wrapper 유지가 맞는 대표 예시
- `app/mypage/tabs/TransactionFlowList.tsx`
- `app/mypage/tabs/ActivityFeed.tsx`
- `app/admin/dashboard/_components/AdminDashboardClient_view.tsx`
- `app/admin/operations/_components/OperationsClient.tsx`

## 6) 금지 규칙 (Do Not)
- 기본 매핑(`base`) 단계에 방문 수령 치환을 섞지 않는다.
- wrapper를 한 번에 제거하지 않는다.
- raw status 모델 자체를 변경하지 않는다.
- direct 연결을 전면/일괄 확장하지 않는다.

## 운영 원칙
- 상태 정책 변경이 아닌 경우, 우선 문서/주석으로 책임 경계를 유지한다.
- direct 연결 신규 도입은 "작은 범위 + 회귀 위험 낮음"일 때만 진행한다.
