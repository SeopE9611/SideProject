# 관리자 인증/인가 정책

## 1) 단일 가드 원칙

- 관리자 UI(`app/admin/**`)의 권한 검사는 **`app/admin/layout.tsx`를 단일 진입점**으로 사용한다.
- 따라서 `app/admin/**/page.tsx`에서는 `getCurrentUser`/`AccessDenied` 중복 권한 체크를 기본적으로 두지 않는다.
- 예외적으로 페이지 단위 추가 검증이 필요할 때만 해당 페이지에 주석으로 근거를 남긴다.

## 2) 관리자 API 가드 원칙

- 관리자 API(`app/api/admin/**/route.ts`)는 각 핸들러 시작부에서 `lib/admin.guard.ts`의 `requireAdmin(req)`를 호출한다.
- `role`, `sub` 등 관리자 식별 필드는 라우트에서 직접 해석하지 않고 `requireAdmin` 내부에서만 검증한다.
- 라우트의 비즈니스 권한 오류도 관리자 권한 거부 케이스와 동일하게 `Forbidden(403)` 포맷(`{ message: 'Forbidden' }`)을 사용한다.

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
