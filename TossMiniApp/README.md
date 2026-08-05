# 도깨비테니스 Apps in Toss

도깨비테니스의 Apps in Toss 전용 프론트엔드 프로젝트입니다.

기존 Next.js 서비스인 `TennisFlowShop`과 분리되어 있으며, 앱인토스
미니앱에서 사용할 모바일 화면만 담당합니다.

## 프로젝트 구조

```text
SideProject/
├─ TennisFlowShop/  # 기존 Next.js 서비스와 백엔드
└─ TossMiniApp/     # Apps in Toss 전용 프론트엔드
```

기존 API, MongoDB, 인증, 주문, 재고 및 결제 로직은
`TennisFlowShop`과 기존 Vercel 환경에 유지합니다.

## 기본 정보

- appName: `dokkaebitennis`
- 표시 이름: `도깨비테니스`
- 프레임워크: React + TypeScript + Vite
- Apps in Toss SDK: `@apps-in-toss/web-framework@2.10.8`
- UI: Toss Design System Mobile
- 패키지 관리자: pnpm

`appName`은 앱인토스 콘솔에 등록된 값과 정확히 일치해야 합니다.

## 환경 변수

`.env.example`을 참고해 로컬 환경 파일을 설정합니다.

```env
VITE_API_BASE_URL=https://www.dokkaebitennis.com
```

`VITE_` 접두사가 붙은 환경 변수는 브라우저 번들에 포함될 수 있습니다.

MongoDB URI, 결제 비밀키, JWT 비밀키 등 서버 전용 값은 이 프로젝트에
추가하지 않습니다.

## 의존성 설치

```bash
pnpm install --frozen-lockfile
```

## 로컬 실행

```bash
pnpm dev
```

## 타입 검사

```bash
pnpm typecheck
```

## AIT 번들 생성

```bash
pnpm build
```

빌드가 완료되면 프로젝트 루트에 다음 파일이 생성됩니다.

```text
dokkaebitennis.ait
```

`dist`, `.ait`, `.env.local`, `node_modules`는 Git에 커밋하지 않습니다.

## 현재 구현 범위

- Apps in Toss 프로젝트 기반
- TDS Provider 연결
- 도깨비테니스 초기 안내 화면
- 브랜드 대표 색상 및 앱 로고 설정
- API 기본 주소 환경 설정
- 모바일 우선 반응형 레이아웃

## 아직 구현하지 않은 범위

- 실제 상품 조회와 상품 상세
- 로그인과 기존 사용자 세션 연동
- 장바구니
- 주문과 결제
- 스트링 교체서비스 신청
- 포인트와 리뷰
- CORS 및 쿠키 정책 변경
- 관리자 기능
