# 프로젝트 점검 리포트 (동기/비동기 + 로딩 UX)

작성일: 2026-02-13

## 1) 우선순위 높음 (바로 수정 권장)

### 1-1. 로그인 로딩 파일 네이밍 이슈
- 현재 로그인 라우트에 `app/login/Loading.tsx`(대문자 L)가 있습니다.
- Next.js App Router의 표준 파일명은 `loading.tsx`이며, 대소문자 구분 환경(Linux/CI)에서는 자동 로딩 UI가 동작하지 않을 수 있습니다.
- **권장 작업**: `Loading.tsx` → `loading.tsx`로 변경하고, `return null` 대신 최소 스피너/스켈레톤을 표시.

### 1-2. 로그인 페이지 Suspense fallback이 null
- `app/login/page.tsx`에서 `<Suspense fallback={null}>`을 사용 중입니다.
- 네트워크 지연 시 공백 화면처럼 보일 수 있어 UX가 저하됩니다.
- **권장 작업**: 로그인 전용 로딩 컴포넌트(브랜드 로고 + 스피너)를 fallback으로 지정.

## 2) 우선순위 중간 (이번 스프린트 권장)

### 2-1. 인증/데이터 대기 페이지의 route-level loading 부재
- `app/messages/page.tsx`는 `getCurrentUser()`를 await 하고 redirect 분기까지 수행하지만, 같은 경로의 `loading.tsx`가 없습니다.
- **권장 작업**: `app/messages/loading.tsx` 추가 (간단 카드 스켈레톤 권장).

### 2-2. 상품 목록 페이지 Suspense fallback 미지정 + route loading 없음
- `app/products/page.tsx`는 async 페이지이며 내부에 `<Suspense>`가 있으나 fallback 미지정입니다.
- 같은 경로 `app/products/loading.tsx`도 없어 느린 환경에서 초기 체감 성능이 떨어질 수 있습니다.
- **권장 작업**:
  1. `app/products/loading.tsx` 추가
  2. `Suspense fallback={<ListPageSkeleton .../>}` 지정

## 3) 우선순위 중간~낮음 (운영 안정성)

### 3-1. 비동기 작업(크론/정산)의 모니터링 보강
- 월 정산 크론 API(`app/api/settlements/cron-monthly/route.ts`)가 집계/업서트는 수행하지만,
  실패 재시도/중복 실행 감지/알림 연동(예: Slack, Sentry) 정책은 코드상 명확히 보이지 않습니다.
- **권장 작업**:
  - 실행 로그를 외부 APM/Sentry로 전송
  - 크론 실행 idempotency 키 또는 월 단위 락 문서 도입
  - 실패 시 운영 알림 채널 연결

### 3-2. 동기/비동기 품질 검증 자동화 확대
- 현재 package script 기준 공식 검증은 lint/smoke/cypress 위주입니다.
- 로딩 UI 표시 여부(특히 route-level loading)는 회귀가 쉬운 항목입니다.
- **권장 작업**:
  - 핵심 라우트(로그인/메시지/상품/체크아웃)에 대해 Playwright 또는 Cypress 시각 회귀 테스트 1~2개 추가
  - throttling 환경에서 skeleton/spinner 노출 여부 확인 케이스 추가

## 4) 점검 명령어 (재현용)

```bash
npm run lint
rg -n "export default async function" app/**/page.tsx
find app -name 'loading.tsx' -o -name 'Loading.tsx'
```

## 5) 빠른 실행 체크리스트

- [ ] `app/login/Loading.tsx` 파일명 소문자화 및 로딩 UI 적용
- [ ] `app/login/page.tsx` Suspense fallback 교체
- [ ] `app/messages/loading.tsx` 추가
- [ ] `app/products/loading.tsx` 추가 + `Suspense` fallback 연결
- [ ] 비동기 크론 작업 알림/모니터링 체계 문서화 및 1차 연동
