# 프로젝트 점검 리포트 (동기/비동기 + 로딩 UX)

작성일: 2026-02-13 (업데이트)

## 진행 상태 요약

- ✅ 완료: `app/login/loading.tsx` 표준화 및 로딩 UI 적용
- ✅ 완료: `app/login/page.tsx` Suspense fallback 시각화
- ✅ 완료: `app/messages/loading.tsx` 추가
- ✅ 완료: `app/products/loading.tsx` 추가 + Suspense fallback 연결
- ✅ 완료: 후속 핵심 라우트 로딩 추가
  - `app/products/[id]/loading.tsx`
  - `app/checkout/success/loading.tsx`
  - `app/messages/write/loading.tsx`
  - `app/mypage/orders/[id]/loading.tsx`
  - `app/rackets/[id]/purchase/loading.tsx`
  - `app/rackets/[id]/select-string/loading.tsx`
  - `app/rentals/[id]/select-string/loading.tsx`
  - `app/services/applications/[id]/shipping/loading.tsx`
  - `app/mypage/rentals/[id]/return-shipping/loading.tsx`
- ✅ 완료: 타입 안정성 게이트 1차 복구
  - `next.config.mjs`의 `typescript.ignoreBuildErrors`를 `false`로 변경
  - `package.json`에 `typecheck` 스크립트(`tsc --noEmit`) 추가

## 다음 우선순위 (남은 작업)

### 1) 사용자 async 라우트 loading 보강 3차 (중간)
- 아직 loading이 없는 사용자 async 페이지를 우선 보강합니다.
- 권장 후보:
  - `app/racket-orders/[orderId]/select-string/page.tsx`
  - board write/edit/detail async 페이지 묶음

### 2) 마이페이지 fetch 안정화 후속 (중간)
- 초기 카운트 fetch는 안정화 완료.
- 후속으로 탭별 상세 API 응답 실패 시 리트라이/백오프 정책을 검토합니다.

### 3) 테스트 커버리지 확대 (중간)
- 진행: `cypress/e2e/loading.states.cy.ts`에 상품 목록 초기 로딩 스켈레톤 노출/해제 E2E를 추가했습니다.
- 추가 권장:
  - 로그인/상품상세/메시지작성/결제완료/라켓구매 흐름의 로딩 회귀 케이스 확대

### 4) 설정 파일 정리 (중간)
- `next.config.mjs`와 `next.config.ts`가 함께 존재하므로 사용 파일을 하나로 통일합니다.

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
