# 관리자 API 인증/인가 정책

`lib/admin.guard.ts`의 `requireAdmin`을 관리자 라우트의 단일 진입점으로 사용한다.

## 상태 코드 기준

- `401 Unauthorized`
  - `accessToken` 쿠키가 없음
  - 토큰이 만료/파손되어 검증 실패
  - 토큰 `sub` 값이 없거나 `ObjectId` 형식이 아님
- `403 Forbidden`
  - 인증은 되었지만(`sub`로 사용자 조회 가능) 사용자 `role`이 `admin`이 아님

## 운영 원칙

1. `app/api/admin/**/route.ts`는 각 핸들러 시작부에서 `requireAdmin(req)`를 호출한다.
2. `role`, `sub` 등 관리자 식별 필드는 라우트에서 직접 해석하지 않고 `requireAdmin` 내부에서만 검증한다.
3. 라우트의 비즈니스 권한 오류도 관리자 권한 거부 케이스와 동일하게 `Forbidden(403)` 포맷(`{ message: 'Forbidden' }`)을 사용한다.
