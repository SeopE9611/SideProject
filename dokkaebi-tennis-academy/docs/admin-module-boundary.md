# Admin 모듈 책임/경계 컨벤션

## 파일 책임 (max responsibility)
- `app/api/admin/dashboard/metrics/route.ts`: **transport only** (인증/응답 포장).
- `app/api/admin/dashboard/metrics/_core/query-collector.ts`: **query collection only**.
- `app/api/admin/dashboard/metrics/_core/aggregate-transformer.ts`: **aggregation transform only**.
- `app/api/admin/dashboard/metrics/_core/response-mapper.ts`: **mapping only**.
- `app/api/admin/operations/route.ts`: **transport + orchestration only**.
- `app/api/admin/package-orders/route.ts`: **패키지 주문 목록 관리자 조회 API**.
- `app/api/admin/package-orders/[id]/route.ts`: **패키지 주문 단건 조회/상태 변경 관리자 API**.
- `app/api/admin/package-orders/[id]/extend/route.ts`: **패키지 만료 연장 관리자 API**.
- `app/api/admin/package-orders/[id]/adjust-sessions/route.ts`: **패키지 횟수 조정 관리자 API**.
- `app/api/admin/package-orders/[id]/pass-status/route.ts`: **패스 상태 변경 관리자 API**.
- `types/admin/operations.ts`: **domain type definition only**.
- `app/admin/users/_hooks/*`: **data fetching only**.
- `app/admin/users/_components/*`: **UI only**.

## import 경계 컨벤션
1. `_components/*`는 `_hooks/*`를 import 할 수 있지만, API route(`app/api/**`)를 직접 import 하지 않는다.
2. `route.ts`는 `_components/*`를 import 하지 않는다.
3. `types/admin/*`는 런타임 로직(import side effect) 없이 type export만 허용한다.
4. `_core/response-mapper.ts`는 DB 접근 코드를 포함하지 않는다.

> lint rule 미적용 상태이므로, 위 규칙을 PR 리뷰 체크리스트로 강제한다.

## 파일 크기(LOC) 팀 규칙
- 목표: 단일 파일은 **권장 300~400 LOC 이내**로 유지한다.
- 400 LOC를 초과하면 우선적으로 다음 단위로 분리한다: `query / aggregation / mapping`, `hooks / components`, `filters / table / dialogs`.
- 예외가 필요한 경우 PR 본문에 사유와 추후 분리 계획을 명시한다.

## 강제 규칙: 관리자 UI API 경계
- 관리자 UI(`app/admin/**`)는 **반드시 `/api/admin/**`만 호출**한다.
- `/api/**`(비 admin 네임스페이스) 호출이 필요한 경우는 읽기 전용 공용 조회 API로 한정하고, 예외 사유를 PR 본문에 명시한다.
- 관리자 전용 행위(승인/반려/수정/삭제/정산/발송 재시도/패키지 변경)는 `app/api/admin/**`로만 제공한다.
- 전환 단계에서는 기존 비-admin 경로에 `Deprecation` 응답 헤더 또는 307/410 응답 정책을 적용해 누락 클라이언트를 조기 탐지한다.

## 허용 경로 목록 (실 구현 기준)

### 관리자 변경성 엔드포인트 (정식)
- `PATCH /api/admin/package-orders/:id`
- `POST /api/admin/package-orders/:id/extend`
- `POST /api/admin/package-orders/:id/adjust-sessions`
- `POST /api/admin/package-orders/:id/pass-status`
- `POST /api/admin/products`
- `PUT /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `DELETE /api/admin/system/cleanup`
- `DELETE /api/admin/system/purge`
- `DELETE /api/admin/settlements/:yyyymm`
- `POST /api/admin/settlements/bulk-delete`

### 레거시 비-admin 허용 범위 (이관 정책 래퍼 전용)
- `GET /api/package-orders` → 307 (`app/api/package-orders/route.ts`)
- `GET /api/package-orders/:id` → 307 (`app/api/package-orders/[id]/route.ts`)
- `PATCH /api/package-orders/:id` → 307 (`app/api/package-orders/[id]/route.ts`)
- `POST /api/package-orders/:id/extend` → 307 (`app/api/package-orders/[id]/extend/route.ts`)
- `POST /api/package-orders/:id/adjust-sessions` → 307 (`app/api/package-orders/[id]/adjust-sessions/route.ts`)
- `POST /api/package-orders/:id/pass-status` → 307 (`app/api/package-orders/[id]/pass-status/route.ts`)
- 위 경로는 `scripts/check-admin-api-boundary.mjs`의 legacy 래퍼 허용 목록과 반드시 동일해야 한다.

## 관리자 API 클라이언트 사용 규약
- 조회 요청은 **SWR + `adminFetcher`** 조합을 기본으로 사용한다.
  - 개별 화면에서 커스텀 fetcher를 만들지 않고 `adminFetcher`를 재사용한다.
  - `cache: 'no-store'`가 필요한 경우 `adminFetcher(url, { cache: 'no-store' })`로 옵션만 덮어쓴다.
- 변경 요청(POST/PATCH/DELETE)은 **`adminMutator`**를 사용한다.
  - 컴포넌트에서 직접 `fetch('/api/admin/**')` 후 `res.ok`/`res.json()`을 반복하지 않는다.
  - 에러 메시지는 `AdminFetchError` + `getAdminErrorMessage` 표준 매핑을 따른다.
- 사용자 피드백(toast)은 공통 helper(`runAdminActionWithToast`)를 우선 사용한다.
  - 성공 시 성공 toast, 실패 시 표준 에러 메시지 toast를 동일 규칙으로 노출한다.
  - 예외적으로 도메인별 상세 에러코드 분기가 필요하면 helper 호출 후 추가 분기한다.
