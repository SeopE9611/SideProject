# Dokkaebi Tennis Academy 🏸

고객의 주문·신청·리뷰 경험을 단순화하고, 관리자 운영 효율을 높이기 위한 테니스 아카데미/스토어 앱입니다.

- 배포: https://dokkaebitennis.vercel.app/
- 개발자: 윤형섭

## 로컬 실행

### 1) 의존성 설치

```bash
npm install
```

### 2) 환경변수 설정

`.env.example`를 복사해서 `.env.local`을 만든 뒤 값을 채워주세요.

```bash
cp .env.example .env.local
```

### 3) 개발 서버 실행

```bash
npm run dev
```

## 주요 스크립트

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # next build
npm run smoke      # 공개 경로 smoke 체크
npm run cy:run     # Cypress E2E
```

## 권장 검증 순서

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

## Cypress 실행 참고

환경에 따라 Cypress 바이너리 캐시가 없을 수 있습니다. 이 경우 아래 명령으로 바이너리를 먼저 설치하세요.

```bash
npx cypress install

# 예시: 상호작용/계약 회귀 스펙
npx cypress run --spec "cypress/e2e/login.interaction.cy.ts,cypress/e2e/api.products.contract.cy.ts,cypress/e2e/messages.api.contract.cy.ts"
```



### 관리자 페이지 E2E 우회(테스트 전용)

관리자 경로(`/admin/*`)는 기본적으로 `layout.tsx`에서 관리자 권한을 단일 체크합니다. E2E에서만 우회가 필요하면 **반드시 테스트 전용 환경**에서 아래 조건을 맞춰 실행하세요.

1. 서버 런타임이 테스트 모드(`NODE_ENV=test`)이거나, E2E 전용 플래그(`E2E_ADMIN_BYPASS_ENABLED=1`)가 켜져 있어야 합니다.
2. 요청 헤더 `x-e2e-admin-bypass-token` 값이 서버 환경변수 `E2E_ADMIN_BYPASS_TOKEN`과 일치해야 합니다.

예시:

```bash
E2E_ADMIN_BYPASS_TOKEN=e2e-secret NODE_ENV=test npm run dev
# 또는
E2E_ADMIN_BYPASS_ENABLED=1 E2E_ADMIN_BYPASS_TOKEN=e2e-secret npm run dev
E2E_ADMIN_BYPASS_TOKEN=e2e-secret npm run cy:run
```

`__e2e` 같은 일반 브라우저 쿠키만으로는 관리자 가드가 우회되지 않습니다.

## 환경별 운영 가이드

### 로컬 개발(Local)
- `.env.local`에 최소 필수값(`MONGODB_URI`, JWT secret류)을 설정한 뒤 `npm run dev`로 실행합니다.
- 코드 수정 후 기본 검증 순서: `lint -> typecheck -> build`.
- E2E를 로컬에서 실행하려면 1회 `npx cypress install`이 필요할 수 있습니다.

### 스테이징(Staging)
- 배포 직후 `npm run smoke`와 주요 E2E 스펙(로딩/가드/상호작용)을 우선 실행합니다.
- 인증 가드가 있는 경로(`/messages/write` 등)는 리다이렉트 상태코드/Location 헤더까지 함께 점검합니다.
- `SMOKE_BASE_URL`을 스테이징 URL로 지정해 스크립트를 재사용합니다.

### 운영(Production)
- 장애 예방을 위해 배포 파이프라인에서 `lint -> typecheck -> build -> smoke`를 필수 게이트로 유지합니다.
- 운영 반영 후에는 주문/신청/메시지 관련 API 에러율과 4xx/5xx 추이를 먼저 확인합니다.
- 회귀가 잦은 구간(로그인, 메시지 전송, 결제완료 진입)은 스모크/계약 테스트를 정기적으로 확장합니다.
