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
```
