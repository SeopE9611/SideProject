# admin 화면 `/api/admin/**` 직접 fetch 목록/우선순위

## 목적
- `app/admin/**` 내부에서 직접 `fetch('/api/admin/**')`를 호출하는 구간을 식별하고,
- `조회(SWR + adminFetcher)` / `변경(adminMutator + 공통 액션 헬퍼)` 규약으로 점진 치환하기 위한 우선순위를 정의한다.

## 우선순위 기준
- **P0 (즉시 치환)**: 에러 처리 분기(`res.ok`, status 분기)와 화면 상태 제어가 복잡한 핵심 관리자 플로우.
- **P1 (단기 치환)**: 사용 빈도가 높거나 데이터 손실/오작동 영향이 큰 쓰기 작업.
- **P2 (중기 치환)**: 단발성/보조성 화면, 기능 영향이 비교적 제한적인 구간.

## 현재 인벤토리 (`rg "fetch\([^\n]*api/admin" app/admin -n` 기준)

### P0
- `app/admin/packages/settings/PackageSettingsClient.tsx` (GET/PUT 설정 조회/저장) → **이번 PR에서 치환 완료**
- `app/admin/scheduling/page.tsx` (GET/PATCH 예약 설정 조회/저장) → **이번 PR에서 치환 완료**
- `app/admin/reviews/_components/AdminReviewMaintenancePanel.tsx` (유지보수 GET/POST/DELETE) → **이번 PR에서 치환 완료**

### P1
- `app/admin/products/new/ProductNewClient.tsx` (상품 등록 POST) → **이번 PR에서 치환 완료**
- `app/admin/rackets/new/_components/AdminRacketNewClient.tsx` (라켓 등록 POST) → **이번 PR에서 치환 완료**
- `app/admin/users/_components/UserDetailClient.tsx`
- `app/admin/rentals/[id]/_components/AdminRentalDetailClient.tsx`
- `app/admin/reviews/_components/AdminReviewListClient.tsx`
- `app/admin/products/[id]/edit/ProductEditClient_view.tsx`
- `app/admin/packages/[id]/PackageDetailClient.tsx`
- `app/admin/orders/[id]/shipping-update/shipping-form.tsx`
- `app/admin/applications/stringing/[id]/shipping-update/shipping-form.tsx`

### P2
- `app/admin/settlements/_components/SettlementsClient_view.tsx`
- `app/admin/rentals/[id]/shipping-update/shipping-form.tsx`
- `app/admin/rentals/_components/AdminRentalsClient.tsx`
- `app/admin/rentals/_components/CleanupCreatedButton.tsx`
- `app/admin/notifications/_components/AdminNotificationsClient.tsx`
- `app/admin/rackets/[id]/edit/_components/AdminRacketEditClient.tsx`
- `app/admin/products/ProductsClient.tsx`
- `app/admin/boards/BoardsClient.tsx`
- `app/admin/orders/[id]/shipping-update/page.tsx`

## 치환 규약
1. 조회: `useSWR(key, adminFetcher)`
2. 변경: `adminMutator(url, { method, ... })`
3. 사용자 메시지: `runAdminActionWithToast` 우선 사용
4. 예외/에러: `AdminFetchError` + `getAdminErrorMessage` 규약 사용 (`res.ok`/개별 status 분기 제거)
