# 관리자 인증/인가 정책

## 1) 단일 가드 원칙

- 관리자 UI(`app/admin/**`)의 권한 검사는 **`app/admin/layout.tsx`를 단일 진입점**으로 사용한다.
- 따라서 `app/admin/**` 하위 컴포넌트/페이지에서 `AuthGuard`를 import하거나 중복 래핑하지 않는다.
- 페이지 내부에서는 데이터 로딩 상태에 필요한 skeleton/fallback UI만 로컬에서 처리한다.
- 예외적으로 페이지 단위 추가 검증이 필요할 때만 해당 페이지에 주석으로 근거를 남긴다.

## 2) 관리자 API 가드 원칙

- 관리자 API(`app/api/admin/**/route.ts`)는 각 핸들러 시작부에서 `lib/admin.guard.ts`의 `requireAdmin(req)`를 호출한다.
- `role`, `sub` 등 관리자 식별 필드는 라우트에서 직접 해석하지 않고 `requireAdmin` 내부에서만 검증한다.
- 관리자 판별은 JWT claim(`role`) 단독 신뢰를 금지하고, `requireAdmin`에서 `users.role`을 재조회해 DB role 기준으로 최종 확정한다.
- 관리자 API의 인증/인가 실패 응답은 프론트 분기 단순화를 위해 `401/403` 모두 `{ ok: false, error: { code, message } }` 포맷으로 통일한다.

## 3) E2E 우회 정책 (레이아웃 가드 예외)

`app/admin/layout.tsx`의 우회(`x-e2e-admin-bypass-token`)는 아래 조건을 모두 만족할 때만 허용한다.

1. `NODE_ENV === 'test'`
2. `VERCEL_ENV !== 'production'`
3. `E2E_ADMIN_BYPASS_ENABLED === '1'`
4. `E2E_ADMIN_BYPASS_TOKEN`이 설정되어 있고, 요청 헤더 토큰과 일치

조건 미충족 시 우회는 거부되며 일반 관리자 인증 흐름으로 진행한다.

## 4) 감사 로그 정책

- 우회 토큰이 제공되면 결과(승인/거부)와 사유를 서버 구조화 로그에 남긴다.
- 로그 이벤트 키:
  - `admin_guard_bypass_approved`
  - `admin_guard_bypass_denied`
- 대표 사유:
  - `non_test_runtime`
  - `production_environment`
  - `feature_disabled`
  - `missing_expected_token`
  - `token_mismatch`
  - `token_matched`
