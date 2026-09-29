# TennisFlowShop Production 배포 스모크 체크리스트

최종 확인일: 2026-06-29

## 1. Vercel Production 환경변수

> 실제 secret 값은 문서에 기록하지 않는다. Production 값에 `localhost`, preview/staging 도메인, 테스트용 secret이 들어가면 배포 전 수정한다.

### 공개 URL

- [ ] `NEXT_PUBLIC_SITE_URL`: `https://dokkaebitennis.com` 또는 실제 canonical 운영 도메인으로 설정한다.
- [ ] `NEXT_PUBLIC_APP_URL`: 계속 사용하는 경우 `NEXT_PUBLIC_SITE_URL`과 같은 운영 도메인으로 맞춘다.
- [ ] `NEXT_PUBLIC_BASE_URL`: Production에서는 운영 도메인 또는 비워 둔다. `localhost` 값은 사용하지 않는다.
- [ ] `VERCEL_URL`: Vercel이 제공하는 배포 호스트가 존재하는지 확인한다. canonical 도메인 대체값으로만 사용한다.
- [ ] `NODE_ENV`: Production 배포에서 `production`으로 동작하는지 확인한다.

### 데이터베이스/인증

- [ ] `MONGODB_URI` 또는 MongoDB 연결 변수: Production Atlas/DB를 가리키며 preview/staging DB가 아닌지 확인한다.
- [ ] JWT/SESSION 관련 변수: 충분히 긴 Production secret을 사용하고 `NEXT_PUBLIC_` 접두사가 붙어 있지 않은지 확인한다.
- [ ] `NEXTAUTH` 또는 auth 관련 변수: 운영 도메인 기반 URL/secret을 사용한다.

### 결제

- [ ] NICE 결제 public/client key: 브라우저에 공개 가능한 값만 `NEXT_PUBLIC_` 또는 client key로 사용한다.
- [ ] NICE 결제 secret/server key: 서버 환경변수에만 두고 `NEXT_PUBLIC_` 접두사를 사용하지 않는다.
- [ ] TOSS 결제 public/client key: 브라우저에 공개 가능한 값만 `NEXT_PUBLIC_` 또는 client key로 사용한다.
- [ ] TOSS 결제 secret/server key: 서버 환경변수에만 두고 `NEXT_PUBLIC_` 접두사를 사용하지 않는다.
- [ ] 결제사 관리자 콘솔의 success/fail/return 허용 도메인이 Production canonical 도메인을 포함하는지 확인한다.

### 메일

- [ ] SMTP/MAIL host/port/user/password/from 값이 Production 발신 계정으로 설정되어 있는지 확인한다.
- [ ] 발신자 주소가 사용자에게 신뢰 가능한 도메인인지 확인한다.
- [ ] SMTP 오류가 고객 화면에 raw message로 노출되지 않는지 확인한다.

## 2. 수동 스모크 URL

- [ ] `/`
- [ ] `/services`
- [ ] `/products`
- [ ] `/products/[id]`
- [ ] `/rackets`
- [ ] `/rackets/[id]`
- [ ] `/rackets/[id]/select-string`
- [ ] `/checkout`
- [ ] `/checkout/success`
- [ ] `/services/packages`
- [ ] `/services/packages/checkout`
- [ ] `/services/packages/success`
- [ ] `/mypage?tab=orders`
- [ ] `/mypage?tab=passes`
- [ ] `/support`
- [ ] `/notifications`
- [ ] `/messages`
- [ ] `/admin/operations`
- [ ] `/admin/orders`
- [ ] `/admin/orders/[id]`

## 3. 수동 확인 항목

- [ ] 로그인
- [ ] 회원가입
- [ ] 비밀번호 찾기
- [ ] 상품 목록/상세
- [ ] 라켓 목록/상세
- [ ] 라켓 + 스트링 선택
- [ ] 일반 체크아웃
- [ ] 패키지권 체크아웃
- [ ] 무통장 주문
- [ ] 카드 결제창 호출 전 prepare 응답의 `successUrl`/`failUrl`/`returnUrl`이 Production 도메인인지 확인
- [ ] 주문 완료 화면
- [ ] 마이페이지 주문/패키지권 탭
- [ ] 관리자 운영 업무
- [ ] 관리자 주문 상세
- [ ] 알림/쪽지
- [ ] 모바일 헤더/햄버거

## 4. 결제 스모크 시나리오

- [ ] 일반 상품 주문: 필수 입력 누락 시 카드/간편결제 창이 열리지 않는다.
- [ ] 라켓 구매: prepare 응답 URL이 Production 도메인 기반이다.
- [ ] 라켓 구매 + 스트링 선택: 선택 옵션/최종 금액 문구가 결제 직전 화면과 일치한다.
- [ ] 교체서비스 단독 신청 결제: prepare 응답 URL이 Production 도메인 기반이다.
- [ ] 라켓 대여 결제: prepare 응답 URL이 Production 도메인 기반이다.
- [ ] 패키지권 결제: 성공 후 `/mypage?tab=passes` 또는 의도한 패키지권 화면으로 이동한다.
- [ ] 무통장입금: 계좌/금액/예금주 표시가 명확하다.
- [ ] 카드/간편결제: 실제 승인 전 단계까지만 호출하고 결제창 진입 직전 URL/금액/주문명을 확인한다.

## 5. 배포 차단 판정 기준

- [ ] P0: secret/token/password 또는 결제 secret이 클라이언트에 노출되지 않는다.
- [ ] P0: Production build/typecheck/lint가 실패하지 않는다.
- [ ] P0: 관리자 권한 우회가 없다.
- [ ] P1: 결제/비밀번호 재설정 URL이 `localhost` 또는 preview 도메인으로 생성되지 않는다.
- [ ] P1: Production 환경변수에 `localhost`가 들어 있지 않다.
- [ ] P1: 대표 상품/라켓 이미지가 운영에서 대량으로 깨지지 않는다.
- [ ] P2: 문구/여백/SEO 등 비차단 개선 사항은 별도 후속으로 기록한다.
