# 교체 서비스 통합 결제/접수 변경 - 관리자 영향 점검 체크리스트 (6단계-C)

## 문서 목적
- 교체 서비스 통합 제출 이후, 관리자 화면에서 **주문-신청 연결 데이터가 정상 노출/분류/탐색**되는지 검증한다.
- 본 문서는 코드 변경 없이 운영/QA 점검 기준만 명문화한다.

## 공통 확인 필드 (모든 화면 공통)
- `orders.stringingApplicationId` 연결 여부
- `orders.isStringServiceApplied` 반영 여부
- 주문 생성 직후부터 관리자 화면에서 이미 신청 연결 상태로 보이는지
- legacy/fallback 주문(`withStringService=true` + 연결 ID 없음)과 신규 통합 주문(연결 ID 존재)의 표시 차이
- 운영센터에서 `warn` / `review` 오분류 여부
- 정렬/필터/검색 조건에서 통합 주문 누락 여부

---

## 1) 관리자 주문 목록 (`/admin/orders`)

### 체크리스트
- [P0] 통합 제출 주문이 목록 진입 직후 누락되지 않는지 확인(최신순/기본 정렬 기준).
- [P0] `isStringServiceApplied=true` 주문이 관련 상태/배지로 식별 가능한지 확인.
- [P1] `stringingApplicationId`가 있는 주문과 없는 주문(legacy/fallback)이 목록에서 혼동되지 않는지 확인.
- [P1] 검색(주문번호/고객) 시 통합 제출 주문이 일반 주문과 동일하게 조회되는지 확인.
- [P2] 페이지네이션 경계(다음 페이지 이동)에서 통합 주문이 사라지지 않는지 확인.

### 기대 상태/배지/연결 정보
- 통합 주문은 주문 생성 직후부터 연결 상태(또는 연결 진입 가능 맥락)가 일관되게 확인되어야 한다.
- legacy/fallback 주문은 연결 ID 부재가 숨겨지지 않고, 후속 확인 필요 상태로 구분 가능해야 한다.

### 통합 제출 이후 바뀔 수 있는 포인트
- 기존에는 주문 생성 후 별도 신청 생성 타이밍 차이로 미연결처럼 보이던 케이스가, 통합 제출에서는 즉시 연결로 보일 수 있다.
- 목록 필터가 `isStringServiceApplied` 기반으로만 동작하면 legacy/fallback 주문이 섞여 보여 운영 혼선이 날 수 있다.

### 이상 시 먼저 볼 파일 경로
- `app/admin/orders/page.tsx`
- `app/api/admin/orders/route.ts`
- `app/features/orders/components/OrdersClient.tsx`

---

## 2) 관리자 주문 상세

### 체크리스트
- [P0] 주문 상세에서 `stringingApplicationId` 기반 신청 상세 이동 링크가 정상 동작하는지 확인.
- [P0] `isStringServiceApplied`가 true인데 연결 ID가 비어 있는 legacy/fallback 주문을 운영자가 인지할 수 있는지 확인.
- [P1] 주문 생성 직후 상세 진입 시점에 이미 연결 정보가 보이는지(지연/깜빡임 없이) 확인.
- [P1] 슬롯 정보(총/사용/남은)가 신청 이력과 정합한지 확인.
- [P2] 주문 취소/배송 관련 액션 시 연결 신청 컨텍스트가 유지되는지 확인.

### 기대 상태/배지/연결 정보
- 신규 통합 주문: `isStringServiceApplied=true` + `stringingApplicationId` 존재 + 신청 상세 이동 가능.
- legacy/fallback 주문: 서비스 적용 흔적은 있으나 연결 ID 없음(추가 확인 필요 상태).

### 통합 제출 이후 바뀔 수 있는 포인트
- 주문 상세가 단일 주문 정보 화면에서 “주문-신청 연결 허브” 역할로 강화된다.
- 연결 즉시성 증가로, 기존 수동 확인 절차(별도 신청 검색)가 축소될 수 있다.

### 이상 시 먼저 볼 파일 경로
- `app/admin/orders/[id]/page.tsx`
- `app/api/admin/orders/[id]/route.ts`
- `app/features/orders/components/OrderDetailClient.tsx`

---

## 3) 교체 서비스 신청 목록

### 체크리스트
- [P0] 통합 제출 직후 생성된 신청이 목록에 즉시 노출되는지 확인.
- [P0] 신청 항목에서 원주문 연결 정보(주문번호/링크)가 누락되지 않는지 확인.
- [P1] legacy/fallback에서 후행 생성된 신청과 신규 통합 신청이 동일 기준으로 정렬/검색되는지 확인.
- [P1] 상태 필터(`received`, `review` 등) 변경 시 통합 신청 누락이 없는지 확인.
- [P2] 대량 데이터 환경에서 최신 통합 신청이 1페이지에서 밀려나도 검색으로 재현 가능한지 확인.

### 기대 상태/배지/연결 정보
- 신청 목록에서 주문 연결이 단방향이 아닌 운영 가능한 형태(원주문 추적 가능)로 유지되어야 한다.
- 통합 신청은 생성 시점 기준 정렬에서 자연스럽게 상단에 노출되어야 한다.

### 통합 제출 이후 바뀔 수 있는 포인트
- 결제와 신청 생성 시점이 동일해져 신청 생성 시각 분포가 주문과 더 강하게 결합된다.
- 기존 분리 흐름에서 발생하던 “주문은 있는데 신청 없음” 케이스가 감소한다.

### 이상 시 먼저 볼 파일 경로
- `app/admin/applications/stringing/page.tsx`
- `app/api/admin/applications/stringing/route.ts`
- `app/features/stringing-applications/components/StringingApplicationsClient.tsx`

---

## 4) 교체 서비스 신청 상세

### 체크리스트
- [P0] 신청 상세에서 연결 주문 링크가 정확한 주문 상세로 이동하는지 확인.
- [P0] 연결 주문의 서비스 적용 플래그/신청 연결 ID와 신청 상세의 문맥이 모순되지 않는지 확인.
- [P1] 주문 취소 요청/배송 업데이트 등 운영 액션 경고가 주문 상태와 일치하는지 확인.
- [P1] 신규 통합 신청과 legacy/fallback 보정 신청의 표시 차이를 운영자가 구분 가능한지 확인.
- [P2] 상세에서 이전/다음 탐색 또는 목록 복귀 후 연결 컨텍스트가 유지되는지 확인.

### 기대 상태/배지/연결 정보
- 신청 상세는 “어떤 주문에서 왔는지”가 즉시 확인 가능해야 한다.
- 연결 불일치(주문은 연결됨인데 신청 상세에서 주문 미표시, 혹은 반대)가 없어야 한다.

### 통합 제출 이후 바뀔 수 있는 포인트
- 신청 상세 진입 경로가 주문 상세 중심으로 재편되며, 연결 정보 정확도가 운영 효율에 직접 영향 준다.
- 잘못된 연결/누락은 배송·검수 단계에서 오처리로 이어질 위험이 높아진다.

### 이상 시 먼저 볼 파일 경로
- `app/admin/applications/stringing/[id]/page.tsx`
- `app/api/admin/applications/stringing/[id]/route.ts`
- `app/features/stringing-applications/components/StringingApplicationDetailClient.tsx`

---

## 5) 운영 통합 센터 (`/admin/operations`)

### 체크리스트
- [P0] 통합 주문/신청 건이 `warn` 또는 `review`로 오분류되지 않는지 확인.
- [P0] 주문-신청 연결 건이 운영 테이블에서 중복/누락 없이 단일 작업 맥락으로 보이는지 확인.
- [P1] 필터(상태/담당/유형) 적용 시 통합 제출 건이 누락되지 않는지 확인.
- [P1] 검색(주문번호/신청번호)으로 조회했을 때 연결 케이스가 항상 재현되는지 확인.
- [P2] 정렬(최신/우선순위) 전환 시 통합 건이 비정상적으로 하위 밀림되지 않는지 확인.

### 기대 상태/배지/연결 정보
- 정상 통합 건은 불필요한 경고 큐가 아닌 기본 처리 큐에 배치되어야 한다.
- `warn/review`는 실제 데이터 불일치·검토 필요 건에만 한정되어야 한다.

### 통합 제출 이후 바뀔 수 있는 포인트
- 연결 즉시성 증가로 “미연결 경고” 비율이 자연스럽게 감소해야 한다.
- 분류 규칙이 과거 fallback 패턴에 과적합되어 있으면 신규 통합 건을 오탐지할 수 있다.

### 이상 시 먼저 볼 파일 경로
- `app/admin/operations/page.tsx`
- `app/api/admin/operations/route.ts`
- `app/api/admin/operations/lib/operationsGetHandler.ts`
- `app/admin/operations/_components/table/operationsTableUtils.ts`
- `app/admin/operations/_components/filters/operationsFilters.ts`

---

## 우선순위별 핵심 점검 포인트 요약

### P0 (릴리스 블로커)
- 주문 생성 직후 관리자 주문/신청 화면에서 연결(`stringingApplicationId`)이 즉시 보이는지
- `isStringServiceApplied`가 주문 목록/상세/운영센터 분류에 일관되게 반영되는지
- 운영센터 `warn/review` 오분류가 없는지

### P1 (운영 안정성)
- legacy/fallback 주문과 신규 통합 주문의 표시/분류 차이가 의도대로 유지되는지
- 정렬/필터/검색에서 통합 주문·신청 누락이 없는지
- 주문 상세 ↔ 신청 상세 상호 이동 시 연결 컨텍스트가 깨지지 않는지

### P2 (회귀/사용성)
- 페이지네이션/정렬 전환 시 통합 건 가시성 유지
- 목록↔상세 왕복 시 상태 배지/링크 일관성 유지

---

## 관리자 QA 실행 순서 (요약)
1. `/admin/orders`에서 신규 통합 주문 1건 + legacy/fallback 주문 1건을 동시에 조회하고, 연결/배지 차이를 확인한다.
2. 신규 통합 주문 상세에서 `stringingApplicationId` 연결 링크와 슬롯 정보를 검증한다.
3. `/admin/applications/stringing` 목록에서 동일 건이 즉시 노출되고 주문 링크가 맞는지 확인한다.
4. 신청 상세에서 주문 링크 역이동 및 상태 문맥(취소/배송/검토)을 재검증한다.
5. `/admin/operations`에서 동일 건의 분류가 `warn/review`로 오분류되지 않는지 확인하고, 필터/검색/정렬 누락 여부를 점검한다.
