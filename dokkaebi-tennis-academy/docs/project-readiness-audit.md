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

## 다음 우선순위 (남은 작업)

### 1) 타입 안정성 게이트 복구 (높음)
- 현재 `next.config.mjs`에서 `typescript.ignoreBuildErrors: true`로 설정되어 있어 타입 에러가 빌드에서 차단되지 않습니다.
- 권장:
  1. `ignoreBuildErrors` 제거(또는 false)
  2. CI에 `tsc --noEmit`를 필수 체크로 추가

### 2) 사용자 핵심 async 라우트 loading 보강 2차 (중간)
- 아직 loading이 없는 사용자 async 페이지를 우선 보강합니다.
- 권장 후보:
  - `app/rackets/[id]/purchase/page.tsx`
  - `app/rackets/[id]/select-string/page.tsx`
  - `app/rentals/[id]/select-string/page.tsx`
  - `app/services/applications/[id]/shipping/page.tsx`

### 3) 마이페이지 fetch 안정화 (중간)
- `MypageClient`의 초기 fetch(주문/신청 카운트)에 에러 처리/abort 처리 보강 필요.
- 권장:
  - `Promise.allSettled`
  - `AbortController`
  - 실패 시 기본값 + 사용자 메시지

### 4) 테스트 커버리지 확대 (중간)
- 진행: `cypress/e2e/loading.states.cy.ts`에 상품 목록 초기 로딩 스켈레톤 노출/해제 E2E를 추가했습니다.
- 추가 권장:
  - 로그인/상품상세/메시지작성/결제완료 로딩 스냅샷 또는 smoke 케이스 확대

## 점검 명령어 (재현용)

```bash
npm run lint
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
