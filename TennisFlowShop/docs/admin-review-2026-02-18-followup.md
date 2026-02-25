# 관리자 페이지 전수 리뷰 후속 보고서 (2026-02-18, merge 후 재점검)

## 점검 범위
- 정적 전수 점검: `app/admin/**`, `app/api/admin/**`, `lib/admin/**`, `scripts/**`, `tests/**`
- 실행 점검: `check:admin-api-boundary`, `check:admin-any-gate`, `lint`, `typecheck`, `build`, `test:contract`, `test:e2e:admin-critical`

## 결론
- 1~6 보완 이후에도 **릴리스 블로커가 남아 있음**.
- 특히 품질 게이트/타입체크/빌드의 실패가 지속되어 운영 배포 기준에는 미달.

## 핵심 결과

### 1) 정책 게이트 실패
- `npm run check:admin-api-boundary` 실패
  - `app/admin/boards/[id]/BoardDetailActions.tsx`에서 `/api/boards/:id` 호출 감지
- `npm run check:admin-any-gate` 실패
  - P0 any 카운트 baseline=4, current=5

### 2) 타입체크/빌드 실패
- `npm run typecheck` 실패
- `npm run build` 실패
- 동일 오류: `app/api/boards/route.ts:238` (`typeParam: communityKind` 타입 불일치)

### 3) 테스트 결과
- `npm run test:contract` 통과 (10/10)
- `npm run test:e2e:admin-critical` 실패
  - `localhost:3000` 미기동으로 `ECONNREFUSED`


## admin-critical smoke 실행 전제
- `scripts/admin-critical-smoke.mjs`는 **서버를 자동으로 띄우지 않으므로**, 실행 전에 테스트 대상 서버가 기동되어 있어야 한다.
- 기본 smoke 대상 포트는 `3000`이며, 반드시 `BASE_URL` 환경변수를 지정해야 한다.
  - 예: `BASE_URL=http://localhost:3000 node scripts/admin-critical-smoke.mjs`
- 로컬/수동 점검 시에는 서버 기동 + 헬스체크 + smoke 실행을 한 번에 처리하는 래퍼(`npm run test:e2e:admin-critical`)를 사용한다.
  - 래퍼는 `next start`(=`pnpm start`)를 실행하고 `http://localhost:3000/` 헬스체크 성공 후 smoke를 수행한다.

## 권장 진행 순서
1. `app/api/boards/route.ts` 타입 오류 복구 (typecheck/build 선복구)
2. `app/admin/boards/[id]/BoardDetailActions.tsx`의 비-admin API 호출 제거
3. P0 any 증가분 제거 후 gate baseline 재정렬
4. admin-critical smoke 실행 단계에서 앱 서버 기동을 CI 또는 스크립트에 포함

## 근거 명령
- `npm run check:admin-api-boundary`
- `npm run check:admin-any-gate`
- `npm run report:admin-any`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:contract`
- `npm run test:e2e:admin-critical`
