# app/api/admin 가드 적용 점검

점검 대상: `app/api/admin/**/route.ts`

## 점검 결과

- 관리자 전용 패키지 주문 API의 실제 구현은 `app/api/admin/package-orders/**`로 수렴.
- 기존 비-admin 경로(`app/api/package-orders/**`)는 **307 Temporary Redirect + Deprecation 헤더** 정책으로 유지.
- `scripts/check-admin-api-boundary.mjs`에서 아래 4개 레거시 변경성 경로가 구현 로직으로 잔존하지 않는지 검사.
  - `app/api/package-orders/[id]/route.ts`
  - `app/api/package-orders/[id]/extend/route.ts`
  - `app/api/package-orders/[id]/adjust-sessions/route.ts`
  - `app/api/package-orders/[id]/pass-status/route.ts`

## 관리자 전용 작업 API 호출 경로 목록 (`app/admin/**` fetch 기준)

- 상품 생성: `POST /api/admin/products` (`app/admin/products/new/ProductNewClient.tsx`)
- 상품 수정: `PUT /api/admin/products/:id` (`app/admin/products/[id]/edit/ProductEditClient.tsx`)
- 상품 삭제: `DELETE /api/admin/products/:id` (`app/admin/products/ProductsClient.tsx`)
- 시스템 정리 미리보기: `GET /api/admin/system/cleanup/preview` (`app/admin/users/_components/UsersClient.tsx`)
- 시스템 정리 실행: `DELETE /api/admin/system/cleanup` (`app/admin/users/_components/UsersClient.tsx`)
- 시스템 완전삭제 미리보기: `GET /api/admin/system/purge/preview` (`app/admin/users/_components/UsersClient.tsx`)
- 시스템 완전삭제 실행: `DELETE /api/admin/system/purge` (`app/admin/users/_components/UsersClient.tsx`)
- 정산 스냅샷 삭제(단건): `DELETE /api/admin/settlements/:yyyymm` (`app/admin/settlements/_components/SettlementsClient.tsx`)
- 정산 스냅샷 삭제(일괄): `POST /api/admin/settlements/bulk-delete` (`app/admin/settlements/_components/SettlementsClient.tsx`)
- 패키지 주문 목록 조회: `GET /api/admin/package-orders`
- 패키지 주문 단건 조회: `GET /api/admin/package-orders/:id`
- 패키지 주문 상태 변경: `PATCH /api/admin/package-orders/:id`
- 패키지 만료 연장: `POST /api/admin/package-orders/:id/extend`
- 패키지 잔여 횟수 조정: `POST /api/admin/package-orders/:id/adjust-sessions`
- 패스 상태 변경: `POST /api/admin/package-orders/:id/pass-status`

## Legacy 비-admin 경로 정책 (적용)

- 정책: **307 Temporary Redirect** (메서드/바디 보존)
- 대상:
  - `GET /api/package-orders` → `/api/admin/package-orders` (`app/api/package-orders/route.ts`)
  - `GET /api/package-orders/:id` → `/api/admin/package-orders/:id` (`app/api/package-orders/[id]/route.ts`)
  - `PATCH /api/package-orders/:id` → `/api/admin/package-orders/:id` (`app/api/package-orders/[id]/route.ts`)
  - `POST /api/package-orders/:id/extend` → `/api/admin/package-orders/:id/extend` (`app/api/package-orders/[id]/extend/route.ts`)
  - `POST /api/package-orders/:id/adjust-sessions` → `/api/admin/package-orders/:id/adjust-sessions` (`app/api/package-orders/[id]/adjust-sessions/route.ts`)
  - `POST /api/package-orders/:id/pass-status` → `/api/admin/package-orders/:id/pass-status` (`app/api/package-orders/[id]/pass-status/route.ts`)
- 공통 헤더: `Deprecation: true`, `Sunset`, `Link: rel="successor-version"`

## 관리자 기능 네임스페이스 외부 잔존 점검 체크리스트

- [x] `app/admin/**`에서 호출하는 관리자 전용 fetch URL이 `/api/admin/**`를 사용하고 있는가.
- [x] 관리자 전용 API(상품/시스템/정산/패키지 변경성)가 `app/api/admin/**`에서 제공되는가.
- [x] 기존 비관리자 경로(`app/api/package-orders/**`)는 307 이관 정책 래퍼만 유지하는가.
- [x] 경계 점검 스크립트가 관리자 변경성 엔드포인트의 비-admin 구현 잔존을 검사하는가.
