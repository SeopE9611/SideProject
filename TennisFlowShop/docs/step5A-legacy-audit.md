# 5단계-A 레거시 정리 후보 감사 (Audit)

작성일: 2026-03-01
범위: 교체 서비스 통합 이후 남은 레거시 경로/컴포넌트/분기/파라미터 처리 점검

## 1) 검토한 파일 목록
- `app/checkout/success/page.tsx`
- `app/checkout/success/_components/CheckoutApplyHandoffClient.tsx`
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

### A-4. `CheckoutApplyHandoffClient.tsx`
- 파일/경로
  - `app/checkout/success/_components/CheckoutApplyHandoffClient.tsx`
  - `app/checkout/success/page.tsx`
- 근거
  - success 페이지가 `isHandoff`일 때 해당 컴포넌트를 실제 렌더하고, 컴포넌트는 countdown 후 `/services/apply`로 push 수행.
- 결론: dead code가 아니라, `autoApply`가 들어오는 시나리오를 위한 **실사용 경로**.

---

## 3) 제거 후보 항목 (B)

### B-1. `autoApply` 생성 부재 대비 잔여 분기
- 파일/경로
  - `app/checkout/success/page.tsx`의 `autoApply` 분기
  - `app/checkout/success/_components/CheckoutApplyHandoffClient.tsx` (간접)
  - `app/checkout/CheckoutButton.tsx`
- 근거
  - success 페이지는 `autoApply=1`을 읽어 핸드오프로 분기하지만,
  - 현재 checkout 버튼은 성공 이동 시 `orderId`만 붙여 이동하며 `autoApply`를 생성하지 않음.
  - 코드베이스 내 검색 기준, `autoApply=1`을 세팅하는 활성 경로가 확인되지 않음.
- 제거 시 영향도
  - **중간**: 외부 링크/구형 북마크/다른 미검토 경로에서 `autoApply`를 붙여 호출할 가능성이 완전히 배제되지 않음.
- 결론: 즉시 삭제보다 "실사용 로그 확인 후 제거"가 적절.

### B-2. success 페이지 내 주석 처리된 자동리다이렉트 잔재
- 파일/경로
  - `app/checkout/success/page.tsx` (`AutoRedirectToApply` 주석)
- 근거
  - 이미 `CheckoutApplyHandoffClient`를 사용 중이고 주석 라인은 비활성 상태.
- 제거 시 영향도
  - **낮음**: 주석 정리 성격.

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

### C-3. `CheckoutApplyHandoffClient` 자체 제거 여부
- 파일/경로
  - `app/checkout/success/_components/CheckoutApplyHandoffClient.tsx`
- 보류 이유
  - 현재 autoApply 생성이 없더라도, success는 파라미터를 읽고 핸드오프를 정상 처리함.
  - 즉시 삭제 시 외부 deep-link/운영 중 수동 링크 시나리오가 깨질 수 있어 로그 근거 후 결정 권장.

---

## 5) 핵심 포인트별 결론

### (1) `autoApply` 흔적
- 읽기: 있음 (`/checkout/success`)
- 생성: 현재 checkout 제출 경로에서는 없음 (`CheckoutButton`은 `orderId`만 전달)
- 판정: **제거 후보(B)이나, 외부 호출 가능성 때문에 보류성 확인 필요**

### (2) `CheckoutApplyHandoffClient.tsx`
- 판정: **현재 코드상 실사용(A)** (단, 트리거 파라미터 유입 빈도는 별도 검증 필요)

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

1. **1순위: `autoApply` 실사용 로그 기반 검증 후 정리 결정**
   - 최근 N일 쿼리 파라미터 유입(log/analytics) 확인 → 0에 수렴 시 success의 `autoApply` 분기/핸드오프 컴포넌트 정리 후보 확정.
2. **2순위: `/services/apply` 주석/가이드 문구 정합성 리라이팅**
   - fallback 목적(기존 주문 연결·추가 신청·단독 신청) 중심으로 주석/문구를 현재 정책과 1:1 정렬.
3. **3순위: `by-order`/`drafts` API 역할 축소 가능성 탐색**
   - 장애복구(bootstrap 실패 시 재조회) 요구를 만족하는지 검증 후, 통합 가능한 최소 API 구조 설계.

