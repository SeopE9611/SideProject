# 프로젝트 점검 리포트 (동기/비동기 + 로딩 UX)

작성일: 2026-02-13 (업데이트)

## 진행 상태 요약

- ✅ 완료: `app/login/loading.tsx` 표준화 및 로딩 UI 적용
- ✅ 완료: `app/login/page.tsx` Suspense fallback 시각화
- ✅ 완료: `app/messages/loading.tsx` 추가
- ✅ 완료: `app/products/loading.tsx` 추가 + Suspense fallback 연결
- ✅ 완료: 후속 핵심 라우트 로딩 추가 (3차 포함)
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
- ✅ 완료: 타입 안정성 게이트 1차 복구
  - `next.config.mjs`의 `typescript.ignoreBuildErrors`를 `false`로 변경
  - `package.json`에 `typecheck` 스크립트(`tsc --noEmit`) 추가
- ✅ 완료: admin 비동기 라우트 로딩 보강
  - `app/admin/*` async 페이지 12개에 route-level loading 적용
- ✅ 완료: smoke/E2E 확장
  - `scripts/smoke.mjs` 공개 경로 점검 범위 확대
  - `cypress/e2e/public.routes.smoke.cy.ts` 추가
  - `cypress/e2e/products.loading.query.cy.ts` 추가
  - `cypress/e2e/login.route.smoke.cy.ts` 추가
  - `cypress/e2e/messages.auth-gate.cy.ts` 추가
  - `cypress/e2e/checkout.success.guard.cy.ts` 추가
  - `cypress/e2e/racket-order.guard.cy.ts` 추가

## 다음 우선순위 (남은 작업)

### 1) 로딩 UX 미세 개선 (중간)
- 현재 주요 사용자/관리자 async 라우트의 로딩은 보강 완료 상태입니다.
- 후속으로 페이지별 스켈레톤 형태(리스트/상세/폼) 세분화 품질을 높입니다.

### 2) 마이페이지 fetch 안정화 후속 (중간)
- 초기 카운트 fetch는 안정화 완료.
- 후속으로 탭별 상세 API 응답 실패 시 리트라이/백오프 정책을 검토합니다.

### 3) 테스트 커버리지 확대 (중간)
- 진행: `cypress/e2e/loading.states.cy.ts`, `cypress/e2e/products.loading.query.cy.ts`, `cypress/e2e/public.routes.smoke.cy.ts`로 로딩/공개 라우트 검증을 확대했습니다.
- 추가 권장:
  - 로그인/메시지/결제/라켓 흐름의 UI 상호작용 회귀(폼 입력/버튼 상태/토스트) 케이스 확대

### 4) 설정 파일 정리 (완료)
- `next.config.ts`를 제거하고 `next.config.mjs` 단일 설정으로 통일했습니다.

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
