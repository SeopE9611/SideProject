# 관리자 페이지 전수 리뷰 (2026-02-18)

## 범위
- 정적 코드 전수 점검: `app/admin/**`, `app/api/admin/**`, `lib/admin/**`, `scripts/*`.
- 실행 점검: lint/typecheck/build/contract/admin-policy 스크립트 실행.

## 현황 요약
- 이전 보완(1~6)로 `POST/PATCH/PUT/DELETE` 관리자 API의 CSRF 누락은 제거되었고, 변경성 admin 프록시는 제거되었습니다.
- 다만, 현재 기준으로 릴리스 블로커 3개와 개선 권장 3개가 남아 있습니다.

## 릴리스 블로커

### 1) CI 수준 정적 게이트 2종 실패
- `check:admin-api-boundary` 실패: 관리자 화면에서 비-admin API 호출이 감지됩니다.
  - `app/admin/boards/[id]/BoardDetailActions.tsx`에서 `/api/boards/:id` 호출.
- `check:admin-any-gate` 실패: P0 any 개수가 baseline 대비 증가했습니다.

### 2) 타입체크/프로덕션 빌드 실패
- `typecheck`와 `build`가 동일한 타입 오류로 실패합니다.
- 오류 파일: `app/api/boards/route.ts` (community type 인자 타입 불일치).

### 3) 관리자 크리티컬 E2E 스모크는 서버 부팅 의존
- `test:e2e:admin-critical`는 localhost:3000 미기동 시 즉시 실패하도록 되어 있습니다.
- CI에서 실행하려면 테스트 단계 전에 앱 서버를 반드시 기동해야 합니다.

## 개선 권장 (비블로커)

### 4) 관리자 UI 직접 fetch 잔존
- `app/admin/**`의 `/api/admin/**` 직접 fetch 호출이 15건 남아 있습니다.
- `adminFetcher/adminMutator` 사용 수(22)보다 적지만, 여전히 화면별 에러 처리 편차가 발생할 수 있습니다.

### 5) 감사로그 미적용 변경성 라우트 잔존
- 비프록시 변경성 admin 라우트 중 `appendAdminAudit/appendAudit` 미적용 파일이 남아 있습니다.
- 대표: package-orders, products, rackets, users/bulk, notifications outbox retry/force 등.

### 6) 정책 스크립트와 운영 문서의 동기화 필요
- `scripts/check-admin-api-boundary.mjs`는 관리자 direct fetch 금지 규칙을 강제하고 있으나,
  일부 신규 파일이 allowlist 없이 진입해 게이트를 깨고 있습니다.
- 규칙 준수 또는 예외 등록의 PR 체크리스트를 고정할 필요가 있습니다.

## 권장 진행 순서
1. **빌드 복구 우선**: `app/api/boards/route.ts` 타입 오류 수정.
2. **정책 게이트 복구**:
   - `app/admin/boards/[id]/BoardDetailActions.tsx`를 `/api/admin/**` 호출 또는 정책 예외 처리.
   - P0 any 증가분을 baseline 수준으로 되돌리기.
3. **관리자 스모크 자동화 안정화**:
   - CI에서 앱 기동 후 `test:e2e:admin-critical` 실행하도록 워크플로우 정리.
4. **후속 품질 개선**:
   - direct fetch 잔여 15건 점진 치환.
   - 감사로그 미적용 라우트 우선순위 적용.

## 이번 점검에서 사용한 명령
- `npm run check:admin-api-boundary` (fail)
- `npm run check:admin-any-gate` (fail)
- `npm run report:admin-any` (pass)
- `npm run lint` (fail)
- `npm run typecheck` (fail)
- `npm run test:contract` (pass)
- `npm run test:e2e:admin-critical` (fail: localhost:3000 미기동)
- `npm run build` (fail)
- `rg -n "proxyToLegacyAdminRoute\(" app/api/admin -g 'route.ts'`
- `rg -n "fetch\('/api/admin|fetch\(\`/api/admin|fetch\(\"/api/admin" app/admin`
