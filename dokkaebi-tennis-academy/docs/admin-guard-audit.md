# app/api/admin 가드 적용 점검

점검 대상: `app/api/admin/**/route.ts`

## 점검 결과

- 전체 라우트 파일 수: 43
- `@/lib/admin.guard` + `requireAdmin` 미사용 파일 수: 0

미사용 파일 목록:

- 없음


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

## 단계적 교체 계획

1. **신규 라우트 생성 단계**
   - `app/api/admin` 하위 신규 파일은 템플릿 수준에서 `requireAdmin` 호출을 기본 포함.
2. **리뷰 단계(정적 점검)**
   - PR 체크에서 `app/api/admin/**/route.ts` 파일에 `requireAdmin` 누락 여부를 스캔.
3. **확장 단계(비-admin 경로 정리)**
   - 관리자 기능이지만 `app/api/admin` 바깥에 존재하는 엔드포인트(예: `app/api/reviews/admin`)를 순차적으로 `requireAdmin` 기반으로 이관.

## 관리자 기능 네임스페이스 외부 잔존 점검 체크리스트

- [ ] `app/admin/**`에서 호출하는 관리자 전용 fetch URL이 `/api/admin/**`를 사용하고 있는가.
- [ ] 관리자 전용 API(`상품 생성/수정/삭제`, `시스템 cleanup/purge`, `정산 삭제`)가 `app/api/admin/**`에서 제공되는가.
- [ ] 기존 비관리자 경로(`app/api/products`, `app/api/system`, `app/api/settlements`)는 점진 이관용 프록시만 유지하고 있는가.
- [ ] `app/api/admin/**/route.ts`에서 수동 쿠키/토큰 파싱 대신 `requireAdmin(req)`를 호출하는가.
