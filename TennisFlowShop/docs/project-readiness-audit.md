# 프로젝트 점검 리포트 (동기/비동기 + 로딩 UX)

작성일: 2026-02-13 (업데이트)

## 진행 상태 요약

- 완료: `app/login/loading.tsx` 표준화 및 로딩 UI 적용
- 완료: `app/login/page.tsx` Suspense fallback 시각화
- 완료: `app/messages/loading.tsx` 추가
- 완료: `app/products/loading.tsx` 추가 + Suspense fallback 연결
- 완료: 후속 핵심 라우트 로딩 추가 (3차 포함)
- `app/products/[id]/loading.tsx`
- `app/checkout/success/loading.tsx`
- `app/messages/write/loading.tsx`
- `app/mypage/orders/[id]/loading.tsx`
- `app/rackets/[id]/purchase/loading.tsx`
- `app/rackets/[id]/select-string/loading.tsx`
- `app/rentals/[id]/select-string/loading.tsx`
- `app/services/applications/[id]/shipping/loading.tsx`
- `app/mypage/rentals/[id]/return-shipping/loading.tsx`
- `app/board/free/write/loading.tsx`
- `app/board/free/[id]/loading.tsx`
- `app/board/free/[id]/edit/loading.tsx`
- `app/board/gear/write/loading.tsx`
- `app/board/gear/[id]/loading.tsx`
- `app/board/gear/[id]/edit/loading.tsx`
- `app/board/market/write/loading.tsx`
- `app/board/market/[id]/loading.tsx`
- `app/board/market/[id]/edit/loading.tsx`
- `app/racket-orders/[orderId]/select-string/loading.tsx`
- 완료: 타입 안정성 게이트 1차 복구
- `next.config.mjs`의 `typescript.ignoreBuildErrors`를 `false`로 변경
- `package.json`에 `typecheck` 스크립트(`tsc --noEmit`) 추가
- 완료: admin 비동기 라우트 로딩 보강
- `app/admin/*` async 페이지 12개에 route-level loading 적용
- 완료: smoke/E2E 확장
- `scripts/smoke.mjs` 공개 경로 점검 범위 확대
- `cypress/e2e/public.routes.smoke.cy.ts` 추가
- `cypress/e2e/products.loading.query.cy.ts` 추가
- `cypress/e2e/login.route.smoke.cy.ts` 추가
- `cypress/e2e/messages.auth-gate.cy.ts` 추가
- `cypress/e2e/checkout.success.guard.cy.ts` 추가
- `cypress/e2e/racket-order.guard.cy.ts` 추가
- `cypress/e2e/login.interaction.cy.ts` 추가
- `cypress/e2e/api.products.contract.cy.ts` 추가
- `cypress/e2e/messages.api.contract.cy.ts` 추가

## 다음 우선순위 (남은 작업)

### 1) 로딩 UX 미세 개선 (중간)

- 현재 주요 사용자/관리자 async 라우트의 로딩은 보강 완료 상태입니다.
- 로그인 라우트는 `FullPageSpinner`에서 폼 구조형 `LoginPageSkeleton`으로 교체해 인지부하를 줄였습니다.
- 후속으로 페이지별 스켈레톤 형태(리스트/상세/폼) 세분화 품질을 높입니다.

### 2) 마이페이지 fetch 안정화 후속 (중간)

- 초기 카운트 fetch는 안정화 완료.
- 후속으로 탭별 상세 API 응답 실패 시 리트라이/백오프 정책을 검토합니다.

### 3) 테스트 커버리지 확대 (중간)

- 진행: `cypress/e2e/loading.states.cy.ts`, `cypress/e2e/products.loading.query.cy.ts`, `cypress/e2e/public.routes.smoke.cy.ts`로 로딩/공개 라우트 검증을 확대했습니다.
- 추가 권장:
  - 로그인/메시지/결제/라켓 흐름의 UI 상호작용 회귀(폼 입력/버튼 상태/토스트) 케이스 확대

### 4) API 계약/타입 안정성 후속 (진행)

- `app/api/products/route.ts`의 입력/필터 타입을 구체화하고, `exclude` ObjectId 유효성 검증을 추가했습니다.
- 인증 가드와 공개 API에 대한 계약 스모크(`messages/api`, `products/api`)를 E2E 스펙으로 보강했습니다.

### 5) 설정 파일 정리 (완료)

- `next.config.ts`를 제거하고 `next.config.mjs` 단일 설정으로 통일했습니다.

## 4차 전수조사 결과 (2026-02-13)

### 조사 스냅샷

- `app/**/*.{ts,tsx}` 기준 `any` 사용은 **1242건**으로, 타입 게이트 복구 이후에도 도메인 모델 정합성 리스크가 큽니다.
- `@ts-ignore`는 **0건**으로, 임시 무시 주석이 누적되지는 않았습니다.
- `app/api/**` 라우트 파일은 **180개**로 운영 표면적이 크고, 회귀 테스트 부재 구간이 생기기 쉬운 구조입니다.
- `cypress/e2e/**` 스펙은 **9개**이며, 현재는 가드/로딩 중심 검증 비중이 높고 실제 사용자 상호작용(입력 검증·상태 전이) 커버리지는 상대적으로 낮습니다.

### 다음 권장 작업 (우선순위)

#### A. 타입 부채 축소 트랙 신설 (최우선)

1. `app/features/orders/api/handlers.ts`와 `app/features/stringing-applications/api/handlers.ts`를 1차 타겟으로 지정합니다.
2. `zod` 스키마 + DTO 타입을 공통화하고, 핸들러 내부 `any`를 `unknown` + 타입가드 패턴으로 치환합니다.
3. 목표 KPI를 명시합니다.
   - 1차(주간): `orders/stringing` 영역 `any` 30% 감축
   - 2차(격주): API 응답/요청 타입 snapshot 테스트 추가

#### B. 상호작용 회귀 E2E 2차 확장 (높음)

1. 기존 가드 스모크를 넘어 실제 동작 검증 케이스를 추가합니다.
   - 로그인: 필수값 누락, 잘못된 비밀번호, 제출중 버튼 disabled
   - 메시지 작성: 제목/내용 validation, 전송 성공·실패 토스트
   - 결제완료: 쿼리 파라미터 누락/유효 케이스의 화면 분기
2. 테스트 안정화를 위해 핵심 폼/버튼에 `data-cy`를 최소 단위로 부여합니다.

#### C. API 계약/운영 안정성 보강 (높음)

1. `app/api/**` 중 관리자 변경성 높은 엔드포인트(orders/rentals/notifications)부터 contract test를 도입합니다.
2. smoke 스크립트는 공개 라우트 외에 인증 필요 주요 경로(세션 없는 상태 기대 동작)를 별도 시나리오로 분리합니다.
3. CI에서 `lint -> typecheck -> build -> smoke`를 기본 게이트로 강제해 로컬 편차를 줄입니다.

#### D. 로딩 UX 품질 2차 정교화 (중간)

1. 현재 route-level `loading.tsx` 커버리지는 충분하므로, 다음은 스켈레톤 품질(정보 구조 유사도)을 높입니다.
2. 리스트/상세/폼 별 skeleton 컴포넌트 규약(높이·밀도·애니메이션)을 문서화해 일관성을 유지합니다.
3. 긴 작업(결제/신청)에는 로딩 스피너 + 진행 문구/취소 가이드를 추가해 불확실성을 줄입니다.

### 제안 실행 순서 (2주)

- **1주차**: A-1/A-2 + B-1(로그인·메시지)
- **2주차**: C-1/C-2 + D-1/D-2
- 완료 기준: `any` 감축 수치, 신규 E2E pass, smoke/빌드 게이트 통과를 PR 본문에 고정 보고

## 점검 명령어 (재현용)

```bash
npm run lint
npm run typecheck
npm run build
python - <<'PY'
import glob,os
for p in sorted(glob.glob('app/**/page.tsx', recursive=True)):
    t=open(p,encoding='utf-8').read()
    if 'export default async function' in t:
        d=os.path.dirname(p)
        if not (os.path.exists(os.path.join(d,'loading.tsx')) or os.path.exists(os.path.join(d,'Loading.tsx'))):
            print(p)
PY
```
