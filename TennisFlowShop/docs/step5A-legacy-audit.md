# 5단계-A 레거시 정리 후보 감사 (Audit)

작성일: 2026-03-01
범위: 교체 서비스 통합 이후 남은 레거시 경로/컴포넌트/분기/파라미터 처리 점검

## 1) 검토한 파일 목록
- `app/checkout/success/page.tsx`
- `app/checkout/success/_components/AutoRedirectToApply.tsx`
- `app/checkout/CheckoutButton.tsx`
- `app/services/apply/page.tsx`
- `app/api/applications/stringing/by-order/[orderId]/route.ts`
- `app/api/applications/stringing/drafts/route.ts`
- `app/features/stringing-applications/api/handlers.ts`
- `app/features/stringing-applications/api/submit-core.ts`
- `app/features/orders/api/handlers.ts`
- `app/mypage/orders/_components/OrderDetailClient.tsx`
- `app/mypage/tabs/OrderList.tsx`
- `app/order-lookup/details/[id]/page.tsx`
- `app/order-lookup/results/page.tsx`

---

## 2) 유지 필요 항목 (A)

### A-1. `/services/apply` + `drafts` + `by-order` 연계 흐름
- 파일/경로
  - `app/services/apply/page.tsx`
  - `app/api/applications/stringing/drafts/route.ts`
  - `app/features/stringing-applications/api/handlers.ts`
  - `app/api/applications/stringing/by-order/[orderId]/route.ts`
- 근거
  - apply 진입 시 `by-order` 조회 → 없으면 `drafts` POST로 초안 보장 → 필요 시 `by-order` 재조회로 `applicationId` 확보하는 순차 fallback이 실제 코드로 살아 있음.
  - `drafts`는 쿼리/바디 모두에서 `orderId`를 받아 멱등 재사용/생성을 처리하고, 권한/서비스대상 여부 검증까지 수행.
  - `by-order`는 "draft 이어쓰기" 전용으로 404를 정상 시나리오로 반환하도록 설계되어 apply 쪽 분기와 맞물림.
- 결론: 현재 fallback 하드닝의 핵심 체인이라 **유지 필요**.

### A-2. 주문 생성 시 자동 연결 필드(`stringingApplicationId`, `isStringServiceApplied`) 갱신 경로
- 파일/경로
  - `app/features/orders/api/handlers.ts`
  - `app/features/stringing-applications/api/submit-core.ts`
- 근거
  - 주문 생성에서 교체 서비스 포함 시 신청서 생성/승격 후 `orders`에 `isStringServiceApplied`, `stringingApplicationId`를 기록.
  - submit-core도 order/rental 양쪽에 동일 연결 필드를 갱신.
- 결론: 고객 표면 CTA 분기(신청/신청서 보기/완료)의 데이터 소스로 **유지 필요**.

### A-3. 고객 표면 CTA(마이페이지/비회원 조회)
- 파일/경로
  - `app/mypage/orders/_components/OrderDetailClient.tsx`
  - `app/mypage/tabs/OrderList.tsx`
  - `app/order-lookup/details/[id]/page.tsx`
  - `app/order-lookup/results/page.tsx`
- 근거
  - 각 화면이 `stringingApplicationId`/`isStringServiceApplied` 기반으로 신청 버튼 또는 신청서 보기/완료 상태를 분기.
  - `/services/apply?orderId=...` 진입 CTA가 실제로 다수 경로에서 유지됨.
- 결론: 통합 이후 UX의 현재 표준 진입점이므로 **유지 필요**.

### A-4. success 페이지 주문완료 정보/CTA 경로
- 파일/경로
  - `app/checkout/success/page.tsx`
- 근거
  - success 페이지는 `orderId` 기반 주문 정보 렌더와 `/services/apply?orderId=...` CTA만 유지됨.
  - 과거 `autoApply` 핸드오프/리다이렉트 분기는 제거되어 현재 checkout 성공 플로우와 정합성이 맞음.
- 결론: 현재 success의 핵심 경로는 **유지 필요**.

---

## 3) 제거 후보 항목 (B)

### B-1. `CheckoutApplyHandoffClient.tsx` 정리 완료
- 파일/경로
  - `app/checkout/success/_components/CheckoutApplyHandoffClient.tsx` (삭제 완료)
- 근거
  - success 페이지에서 `autoApply` 기반 핸드오프를 더 이상 사용하지 않도록 정리되었고,
  - 컴포넌트 파일도 코드베이스에서 제거됨.
- 결론: 제거 후보가 아니라 **정리 완료 항목**.

### B-2. `autoApply` 관련 분기 정리 완료
- 파일/경로
  - `app/checkout/success/page.tsx`
  - `app/checkout/CheckoutButton.tsx`
- 근거
  - success는 `orderId`만 사용하며 `autoApply` 파라미터를 읽지 않음.
  - checkout 성공 이동도 `orderId` 중심으로 동작해, `autoApply` 생성/소비 경로가 제거됨.
- 결론: `autoApply` 잔여 분기는 **정리 완료**.

### B-3. `AutoRedirectToApply.tsx` 파일 정리
- 파일/경로
  - `app/checkout/success/_components/AutoRedirectToApply.tsx` (삭제 완료)
- 근거
  - 코드베이스 검색 기준 컴포넌트 참조가 0건이며 파일 단독 정의만 존재.
- 결론: dead file로 판단되어 **삭제 완료**.

---

## 4) 보류 항목 (C)

### C-1. `by-order` 라우트 범위 축소 여부
- 파일/경로
  - `app/api/applications/stringing/by-order/[orderId]/route.ts`
- 보류 이유
  - 현재는 draft 전용 조회로 apply의 선행조회/후속재조회에 모두 사용됨.
  - drafts bootstrap 실패/지연 시에도 복구경로로 의미가 있어 즉시 축소는 위험.

### C-2. `/services/apply` 내부 문구/주석 중 “옵션 A/직접입력” 서술
- 파일/경로
  - `app/services/apply/page.tsx`
- 보류 이유
  - 화면 설명은 현재 fallback 역할(주문 연결/추가 신청/단독 신청)을 반영하지만, 일부 주석은 과거 전환 맥락(옵션 A)이 강하게 남아 있음.
  - 기능과 맞지 않는 단정 문구(예: 주문 기반 only와 단독신청 CTA 병존)는 코드 정리 시점에 함께 정합성 검토 필요.

### C-3. success 화면 UX 리라이팅 여부
- 파일/경로
  - `app/checkout/success/page.tsx`
- 보류 이유
  - 현재 확인 기준, handoff/autoApply 관련 잔여 주석·분기는 정리된 상태.
  - 이번 단계는 dead code 정리 범위로 마감하고, 화면 카피/레이아웃 리디자인은 별도 단계에서 검토 권장.

---

## 5) 핵심 포인트별 결론

### (1) `autoApply` 흔적
- 읽기: 없음 (success 페이지 분기 제거)
- 생성: 없음 (checkout 성공 이동은 `orderId`만 전달)
- 판정: **정리 완료(B)**

### (2) `CheckoutApplyHandoffClient.tsx`
- 판정: **삭제 완료(B)**

### (3) `by-order` / `drafts` route
- 판정: **둘 다 현재 `/services/apply` fallback의 필수 축(A)**
- 비고: `by-order`는 "draft lookup", `drafts`는 "멱등 생성/재사용"으로 역할이 분리되어 있어 당장 통합/삭제하기 어려움

### (4) `/services/apply` 내부 주석/문구/분기
- 판정: **기능은 현재 fallback 역할과 대체로 부합(A/C 혼합)**
- 보류성 흔적: 옵션 A 표현, 단독신청 CTA 병행 설명 등 문구 정합성 리라이팅 여지 존재(C)

### (5) 고객 표면 CTA
- 판정: **대체로 정리 완료 + 유지 필요(A)**
- 확인 결과: 주요 CTA는 `/services/apply?orderId=...` 또는 `신청서 보기`로 정렬되어 있고, 옛 성공페이지 유도 CTA는 확인되지 않음

---

## 6) 다음 실제 정리 작업 우선순위 제안

1. **1순위: success 화면 UX 리라이팅 필요성 검토**
   - dead code 정리는 완료되었으므로, 이후 변경은 기능 정합성 유지 전제에서 UI/카피 개선 단위로 분리 검토.
2. **2순위: `/services/apply` 주석/가이드 문구 정합성 리라이팅**
   - fallback 목적(기존 주문 연결·추가 신청·단독 신청) 중심으로 주석/문구를 현재 정책과 1:1 정렬.
3. **3순위: `by-order`/`drafts` API 역할 축소 가능성 탐색**
   - 장애복구(bootstrap 실패 시 재조회) 요구를 만족하는지 검증 후, 통합 가능한 최소 API 구조 설계.
