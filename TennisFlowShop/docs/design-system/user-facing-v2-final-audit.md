# 사용자 접근 페이지 디자인 V2 최종 감사

## 1. 감사 기준

- **감사 기준 시점:** 2026-07-29 작업 시작 시점의 최신 `main` 병합 상태를 담은 현재 작업 트리. PR #2304의 과거 base나 기존 감사표의 판정을 근거로 재사용하지 않고 `app/**/page.tsx`와 실제 import·redirect·접근 제어를 다시 읽었다.
- **조사 명령:** `find TennisFlowShop/app -type f \( -name 'page.tsx' -o -name 'loading.tsx' -o -name 'error.tsx' -o -name 'not-found.tsx' \) -print`, `rg -n --glob '**/page.tsx' '^import |redirect\(|notFound\(' TennisFlowShop/app`, 그리고 요청된 Button/색/타입/폭/position/surface/skeleton 키워드 조합을 `app`, 실제 import된 route-local component, `components`에 적용했다. 검색 일치 수를 결함 수로 환산하지 않고 주변 surface와 사용자 역할을 읽었다.
- **읽은 정책:** `dokkaebi-design-system-v2.md`, `dokkaebi-v2-interaction-responsive-policy.md`, `responsive-ui-rules.md`, `design-system-guidelines.md`, `design-system-audit.md`, `prototypes/typography-cleartype-full-audit.md`, commerce detail/discovery/selection 정책 3종, badge system/surface 감사 2종, `color-token-policy.md`, `status-color-dictionary.md` 전부를 확인했다.
- **판정 우선순위:** 최신 V2/V2.1/V2.2 정책 → 현재 primitive(`components/ui/button.tsx`, `card.tsx`, public component) → 구 감사 기록 순이다. `font-brand-display`는 40px 이상 display, 작은 데이터·본문·버튼은 UI font, 모바일 CTA는 44px과 1열, 상태색과 라임 identity는 분리하는 기준을 적용했다.
- **운영 정책:** 비회원 주문과 TossPayments는 미사용, NicePay만 운영한다. 비회원/Toss route는 삭제 후보가 아니라 `INACTIVE_OPERATION`이다. `/board` 홈은 디자인 대상 제외다. community flag가 켜져야 하는 free/market/gear(및 같은 flag의 brands/hot)는 `ACTIVE_CONDITIONAL`이다.
- **제외 기준:** `/admin/**`는 `EXCLUDED_ADMIN`, `/concept/**`는 `EXCLUDED_CONCEPT`; 권한 전용 작성 화면은 `ROLE_LIMITED`; UI 없는 영구 이동은 `REDIRECT_ONLY`다. 제외·비활성도 파일과 이유를 매트릭스에 남겼다.
- **한계:** 브라우저/서버/테스트 실행이 금지된 정적 감사다. 실제 viewport에서만 확정 가능한 후보는 `VISUAL_CONFIRMATION_REQUIRED`로 분리했다.

## 2. 라우트 인벤토리 요약

| 지표 | 수 | 증명/설명 |
|---|---:|---|
| 발견한 전체 page route | **148** | `app/**/page.tsx` 전수 |
| 관리자 제외 | **47** | `/admin/**`; 아래 집계 행에 파일군 기록 |
| concept 제외 | **1** | `/concept/home-benchmark` |
| redirect-only | **8** | `/orders`, `/packages`, `/packages/[id]`, mypage applications/rentals/packages, racket purchase/rent |
| inactive-operation | **9** | 비회원 조회 3 + Toss 6 |
| 실제 감사 ACTIVE_PUBLIC | **39** | 비로그인 렌더 가능 화면; private payment 조회·성공 및 academy apply success 포함 |
| 실제 감사 ACTIVE_MEMBER | **27** | 인증/소유권이 필요한 화면; racket select-string 포함 |
| ACTIVE_CONDITIONAL | **14** | community flag route |
| ROLE_LIMITED | **2** | notice/event write |
| 디자인 제외 public shell | **1** | `/board`; 총계 검증에서는 `ACTIVE_PUBLIC`과 별도인 N/A 분류 |
| loading/error/not-found 상태 파일 | **99** | admin/concept 포함 발견 수; 활성 사용자 state도 대응 route와 함께 검토 |
| 최종 미조사 route | **0** | 148 = ADMIN 47 + CONCEPT 1 + REDIRECT_ONLY 8 + INACTIVE 9 + ACTIVE_PUBLIC 39 + ACTIVE_MEMBER 27 + ACTIVE_CONDITIONAL 14 + ROLE_LIMITED 2 + 디자인 제외 1 |

`loading/error/not-found` 99개는 독립 route가 아니라 부모 route의 상태로 조사했다. 전역 `loading.tsx`, `error.tsx`, `not-found.tsx`, 서비스 성공 error 및 각 route loading을 포함한다.

## 3. 전체 라우트 매트릭스

표의 “핵심 컴포넌트”는 page가 직접 렌더하거나 공용 상태를 구성하는 진입점이다. `—`는 page 자체 렌더링이다. `C`=COMPLETE, `P`=PARTIAL, `L`=LEGACY, `N/A`=NOT_APPLICABLE이다.

| 영역 | 라우트 | 접근 상태 | 실제 렌더링 파일 | 연결된 핵심 컴포넌트 | V2 | 주요 판정 | 우선순위 | 비고 |
|---|---|---|---|---|---|---|---|---|
| 홈 | `/` | ACTIVE_PUBLIC | `app/page.tsx` | `HomePageRedesign`, Header·SideMenu·Footer | P | 활성 구현의 캐러셀·탭·선택 control은 raw button 여부가 아니라 실제 상태별 시각·focus를 확인해야 함 | P2 | V-01; `HomePageClient`는 dead-code 후보 |
| 상품 | `/products` | ACTIVE_PUBLIC | `app/products/page.tsx` | `CommerceCatalogHero`, `FilterableProductList`, `ProductCard` | C | 공용 catalog hero의 6개 slot 계약 적용 완료 | P2 | 회귀 확인 |
| 상품 | `/products/[id]` | ACTIVE_PUBLIC | `app/products/[id]/page.tsx` | `ProductDetailClient`, gallery/purchase panel/related | P | 상단·구매 panel surface 밀도, skeleton 대응 확인 필요 | P1 | F-03, V-02 |
| 상품 | `/products/recommend` | ACTIVE_PUBLIC | `app/products/recommend/page.tsx` | 추천 폼/결과 카드 | P | 선택 CTA·결과/빈 상태 위계 부분 적용 | P2 | |
| 라켓 | `/rackets` | ACTIVE_PUBLIC | `app/rackets/page.tsx` | `CommerceCatalogHero`, `FilterableRacketList`, racket card | C | 공용 catalog hero의 6개 slot 계약 적용 완료 | P2 | 도메인별 guide 내용 차이는 결함 아님 |
| 라켓 | `/rackets/[id]` | ACTIVE_PUBLIC | `app/rackets/[id]/page.tsx` | detail client/gallery/action panel | P | 구매·대여·스트링 CTA 경쟁 | P1 | F-03, V-03 |
| 라켓 | `/rackets/compare` | ACTIVE_PUBLIC | `app/rackets/compare/page.tsx` | compare client/store, skeleton | P | 좁은 폭 비교표/고정 열 확인 필요 | P1 | V-04 |
| 라켓 | `/rackets/finder` | ACTIVE_PUBLIC | `app/rackets/finder/page.tsx` | finder client/result cards | P | 단계 CTA와 결과 action 위계 혼재 | P2 | |
| 라켓 흐름 | `/rackets/[id]/purchase` | REDIRECT_ONLY | `app/rackets/[id]/purchase/page.tsx` | `redirect` | N/A | `/rackets/[id]/select-string`으로 이동 | — | 목적지와 loading skeleton 설정도 동일 |
| 라켓 흐름 | `/rackets/[id]/rent` | REDIRECT_ONLY | `app/rackets/[id]/rent/page.tsx` | `redirect` | N/A | `/rackets/[id]`로 이동 | — | 대여 string 선택 화면으로 이동하지 않음 |
| 라켓 흐름 | `/rackets/[id]/select-string` | ACTIVE_MEMBER | `app/rackets/[id]/select-string/page.tsx` | select-string client/LoginGate | P | 조건 선택·다음 행동 밀도 | P1 | `GUEST_ORDER_MODE !== "on"`이면 비로그인에 LoginGate; 현 운영은 guest off |
| 라켓 흐름 | `/rentals/[id]/select-string` | ACTIVE_MEMBER | `app/rentals/[id]/select-string/page.tsx` | rental select client/LoginGate | P | 소유권·상태 안내와 선택 UI 결합 | P1 | F-06 |
| 라켓 흐름 | `/racket-orders/[orderId]/select-string` | ACTIVE_MEMBER | `app/racket-orders/[orderId]/select-string/page.tsx` | `SelectStringClient`, LoginGate | P | guest 분기는 운영 off, 본인/관리자만 | P1 | |
| 장바구니 | `/cart` | ACTIVE_PUBLIC | `app/cart/page.tsx` | Cart client/items/summary | P | summary/card 중첩과 모바일 action 밀도 | P1 | F-04, V-05 |
| 결제 | `/checkout` | ACTIVE_MEMBER | `app/checkout/page.tsx` | checkout form/order summary/NicePay | P | sticky CTA·요약 관계는 viewport 확인 전 차단 결함으로 확정 불가 | P1 | F-04, V-06 |
| 결제 | `/checkout/success` | ACTIVE_MEMBER | `app/checkout/success/page.tsx` | ResultState, order summary | P | 성공 이후 핵심 행동보다 세부 card가 큼 | P1 | F-05 |
| 결제 | `/checkout/nice/fail` | ACTIVE_PUBLIC | `app/checkout/nice/fail/page.tsx` | `PaymentFailureResult` | C | 운영 실패 공용 결과 사용 | P2 | 문구/재시도 목적지만 회귀 확인 |
| 결제 | `/checkout/toss/fail` | INACTIVE_OPERATION | `app/checkout/toss/fail/page.tsx` | failure result | N/A | Toss 미운영 | DEFERRED | 삭제 단정 금지 |
| 결제 | `/checkout/toss/success` | INACTIVE_OPERATION | `app/checkout/toss/success/page.tsx` | Toss confirmation | N/A | Toss 미운영 | DEFERRED | |
| 개인결제 | `/private-payments/[id]` | ACTIVE_PUBLIC | `app/private-payments/[id]/page.tsx` | `getPublicPrivatePaymentView`, `PrivatePaymentClient`, NicePay | P | 로그인·토큰 gate 없이 공개 view를 조회; 금액·기한·결제 CTA 위계 개선 | P1 | F-06; 이름만으로 Toss/비활성 분류하지 않음 |
| 개인결제 | `/private-payments/success` | ACTIVE_PUBLIC | `app/private-payments/success/page.tsx` | `paymentId` 조회, ResultState/summary | P | search param의 `paymentId`로 직접 조회하며 로그인 gate 없음 | P1 | F-05 |
| 개인결제 | `/private-payments/nice/fail` | ACTIVE_PUBLIC | `app/private-payments/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 공용 실패 | P2 | |
| 서비스 | `/services` | ACTIVE_PUBLIC | `app/services/page.tsx` | service hero/cards/CTA | P | V2 적용, 긴 CTA와 surface 반복 잔여 | P1 | F-04 |
| 서비스 | `/services/apply` | ACTIVE_MEMBER | `app/services/apply/page.tsx` | `ApplyHero`, steps/footer, NicePay button | P | 긴 단계 폼·내부 요약 card 반복; 작업 차단 여부는 viewport 확인 필요 | P1 | F-04, V-07 |
| 서비스 | `/services/success` | ACTIVE_MEMBER | `app/services/success/page.tsx` | result/summary + local error/loading | P | 정상·error·loading 구조 차 | P1 | F-05/F-08 |
| 서비스 | `/services/pricing` | ACTIVE_PUBLIC | `app/services/pricing/page.tsx` | PublicPageHero/pricing cards | C | 정보형 V2 문법 양호 | P2 | |
| 서비스 | `/services/locations` | ACTIVE_PUBLIC | `app/services/locations/page.tsx` | location cards/map links | P | 외부 링크 새 창 안내 점검 | P2 | F-09 |
| 서비스 | `/services/tension-guide` | ACTIVE_PUBLIC | `app/services/tension-guide/page.tsx` | guide/result panels | P | 정보 card 중첩·작은 데이터 위계 | P2 | |
| 서비스 | `/services/applications/[id]/shipping` | ACTIVE_MEMBER | `app/services/applications/[id]/shipping/page.tsx` | shipping form/LoginGate | P | 주소·배송 다음 행동이 compact hero와 분리 | P1 | F-06 |
| 패키지 | `/services/packages` | ACTIVE_PUBLIC | `app/services/packages/page.tsx` | `StringPackagesPageClient`, `UnifiedPackageCard` | P | 카드 CTA 반복/가격·횟수 위계 | P1 | F-04 |
| 패키지 | `/services/packages/checkout` | ACTIVE_MEMBER | `app/services/packages/checkout/page.tsx` | `PackageCheckoutClient`, LoginGate | P | 중첩 요약과 CTA 관계는 viewport 확인 전 차단 결함으로 확정 불가 | P1 | F-04, V-06 |
| 패키지 | `/services/packages/success` | ACTIVE_MEMBER | `app/services/packages/success/page.tsx` | ResultState/SummaryCard/UnifiedPackageCard | P | 성공 화면 안 feature card 중첩 | P1 | F-05 |
| 패키지 | `/services/packages/nice/fail` | ACTIVE_PUBLIC | `app/services/packages/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 실패 | P2 | |
| 패키지 | `/services/packages/toss/fail` | INACTIVE_OPERATION | `app/services/packages/toss/fail/page.tsx` | failure result | N/A | Toss 미운영 | DEFERRED | |
| 패키지 | `/services/packages/toss/success` | INACTIVE_OPERATION | `app/services/packages/toss/success/page.tsx` | redirect/loading client | N/A | Toss 미운영 | DEFERRED | |
| 패키지 별칭 | `/packages` | REDIRECT_ONLY | `app/packages/page.tsx` | `redirect('/services/packages')` | N/A | canonical 이동 | — | |
| 패키지 별칭 | `/packages/[id]` | REDIRECT_ONLY | `app/packages/[id]/page.tsx` | `redirect` | N/A | query 보존 canonical 이동 | — | |
| 케어 | `/racket-care` | ACTIVE_PUBLIC | `app/racket-care/page.tsx` | racket-care V2 hero | C | V2 대표 구현 | P2 | 상태색 분리 유지 |
| 케어 | `/mypage/racket-care` | ACTIVE_MEMBER | `app/mypage/racket-care/page.tsx` | member care dashboard | P | compact 업무 hero/상태/행동 밀도 | P1 | F-06 |
| 대여 | `/rentals/[id]/checkout` | ACTIVE_MEMBER | `app/rentals/[id]/checkout/page.tsx` | rental checkout/NicePay | P | 기간·보증금·배송·총액 분산; 작업 차단은 정적으로 확정 안 됨 | P1 | F-06, V-06 |
| 대여 | `/rentals/success` | ACTIVE_MEMBER | `app/rentals/success/page.tsx` | result/rental summary | P | 성공 화면 공용 문법 불완전 | P1 | F-05 |
| 대여 | `/rentals/nice/fail` | ACTIVE_PUBLIC | `app/rentals/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 실패 | P2 | |
| 마이페이지 | `/mypage` | ACTIVE_MEMBER | `app/mypage/page.tsx` | dashboard/tabs/transaction cards | P | destination과 정보 카드 다층 구조 | P1 | F-06, V-08 |
| 마이페이지 | `/mypage/profile` | ACTIVE_MEMBER | `app/mypage/profile/page.tsx` | profile form | P | save/cancel 위계와 상태 피드백 | P2 | |
| 주문 상세 | `/mypage/orders/[id]` | ACTIVE_MEMBER | `app/mypage/orders/[id]/page.tsx` | 공용 transaction detail sections | P | 최근 공용 상세 적용 상태의 정보 순서 회귀 확인 | P2 | V-11 |
| 대여 | `/mypage/rentals` | REDIRECT_ONLY | `app/mypage/rentals/page.tsx` | `redirect` | N/A | `/mypage?tab=orders&scope=rental`로 이동하는 UI 없는 별칭 route | — | |
| 대여 | `/mypage/rentals/[id]/return-shipping` | ACTIVE_MEMBER | `app/mypage/rentals/[id]/return-shipping/page.tsx` | return shipping form | P | 위험/보조/제출 action 분리 필요 | P1 | F-06 |
| 교체 | `/mypage/applications` | REDIRECT_ONLY | `app/mypage/applications/page.tsx` | 인증 확인 후 `redirect` | N/A | 인증 확인 후 마이페이지 신청 내역 탭으로 이동하는 UI 없는 별칭 route | — | 비로그인은 `/login?next=...`, 로그인 사용자는 `/mypage?tab=orders&scope=application` |
| 교체 상세 | `/mypage/applications/[id]` | ACTIVE_MEMBER | `app/mypage/applications/[id]/page.tsx` | 공용 application detail sections | P | 최근 공용 상세 적용 상태의 배송/다음 행동 회귀 확인 | P2 | V-11 |
| 아카데미 상세 | `/mypage/academy-applications/[id]` | ACTIVE_MEMBER | `app/mypage/academy-applications/[id]/page.tsx` | academy application detail | P | 일정 긴 줄·상태와 취소 action 경쟁 | P1 | F-06, V-09 |
| 패키지 | `/mypage/packages` | REDIRECT_ONLY | `app/mypage/packages/page.tsx` | `redirect` | N/A | `/mypage?tab=passes`로 이동하는 UI 없는 별칭 route | — | |
| 인증 별칭 | `/orders` | REDIRECT_ONLY | `app/orders/page.tsx` | `redirect('/mypage?tab=orders')` | N/A | UI 없음 | — | |
| 비회원 | `/order-lookup` | INACTIVE_OPERATION | `app/order-lookup/page.tsx` | lookup form | L | 비회원 미운영, 레거시 정적 UI | DEFERRED | |
| 비회원 | `/order-lookup/results` | INACTIVE_OPERATION | `app/order-lookup/results/page.tsx` | result list | L | 비회원 미운영 | DEFERRED | |
| 비회원 | `/order-lookup/details/[id]` | INACTIVE_OPERATION | `app/order-lookup/details/[id]/page.tsx` | guest detail | L | 비회원 미운영 | DEFERRED | |
| 라켓 결제 | `/rackets/nice/fail` | ACTIVE_PUBLIC | `app/rackets/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 실패 | P2 | |
| 라켓 결제 | `/rackets/toss/fail` | INACTIVE_OPERATION | `app/rackets/toss/fail/page.tsx` | failure result | N/A | Toss 미운영 | DEFERRED | |
| 라켓 결제 | `/rackets/toss/success` | INACTIVE_OPERATION | `app/rackets/toss/success/page.tsx` | Toss confirmation | N/A | Toss 미운영 | DEFERRED | |
| 아카데미 | `/academy` | ACTIVE_PUBLIC | `app/academy/page.tsx` | class/contact/guide cards | P | 운영 데이터에 따라 소개/차단 분기; 일정 행 밀도 | P1 | V-09 |
| 아카데미 | `/academy/apply` | ACTIVE_MEMBER | `app/academy/apply/page.tsx` | `AcademyApplyClient` | P | custom raw selector buttons, 날짜 4→7열 | P1 | F-01, V-09 |
| 아카데미 | `/academy/apply/success` | ACTIVE_PUBLIC | `app/academy/apply/success/page.tsx` | query `applicationId` 기반 result/detail list | P | 로그인·토큰·소유권·DB 조회 gate 없는 공개 결과 화면; 다른 success와 surface 불일치 | P1 | F-05 |
| 후기 | `/reviews` | ACTIVE_PUBLIC | `app/reviews/page.tsx` | reviews client/filter/card | P | empty/filter empty 및 action 문법 | P1 | F-05 |
| 후기 | `/reviews/write` | ACTIVE_MEMBER | `app/reviews/write/page.tsx` | review form/photo upload | P | feature Card 중첩·모바일 footer | P1 | F-04 |
| 게시판 | `/board` | EXCLUDED (DESIGN) | `app/board/page.tsx` | board home | N/A | 요청에 따라 디자인 제외; 메뉴는 flag와 동기화 필요 | — | 운영 이슈 F-10 |
| 게시판 | `/board/notice` | ACTIVE_PUBLIC | `app/board/notice/page.tsx` | `NoticeListClient` | P | 목록/empty/loading 문법 | P1 | |
| 게시판 | `/board/notice/[id]` | ACTIVE_PUBLIC | `app/board/notice/[id]/page.tsx` | `NoticeDetailClient` | P | 상세 action/긴 제목 | P1 | |
| 게시판 | `/board/notice/write` | ROLE_LIMITED | `app/board/notice/write/page.tsx` | `NoticeWriteClient` | P | 작성 권한 UI/API guard 재확인 | P2 | 일반 사용자 대상 아님 |
| 게시판 | `/board/event` | ACTIVE_PUBLIC | `app/board/event/page.tsx` | shared `NoticeListClient` | P | notice 공유로 이벤트 의미 차 약함 | P1 | |
| 게시판 | `/board/event/[id]` | ACTIVE_PUBLIC | `app/board/event/[id]/page.tsx` | shared `NoticeDetailClient` | P | 긴 제목/기간 상태 위계 | P1 | |
| 게시판 | `/board/event/write` | ROLE_LIMITED | `app/board/event/write/page.tsx` | shared `NoticeWriteClient` | P | 작성 권한 전용 | P2 | |
| 게시판 | `/board/qna` | ACTIVE_PUBLIC | `app/board/qna/page.tsx` | `QnaPageClient` | P | 답변상태/카테고리/작성 CTA 밀도 | P1 | |
| 게시판 | `/board/qna/[id]` | ACTIVE_PUBLIC | `app/board/qna/[id]/page.tsx` | detail/dialog/replies | P | feature surface가 답변/본문마다 반복 | P1 | F-04 |
| 게시판 | `/board/qna/write` | ACTIVE_MEMBER | `app/board/qna/write/page.tsx` | form/upload/dialog | P | upload surface와 CTA, dialog 설명 점검 | P1 | F-09 |
| 커뮤니티 | `/board/free`, `/board/free/[id]`, `/board/free/write`, `/board/free/[id]/edit` | ACTIVE_CONDITIONAL | 각 route `page.tsx` | FreeBoard list/detail/write/edit clients | P | flag off면 `/board?closed=community`; on일 때 전체 감사 | P2 | 4 routes |
| 커뮤니티 | `/board/market`, `/board/market/[id]`, `/board/market/write`, `/board/market/[id]/edit` | ACTIVE_CONDITIONAL | 각 route `page.tsx` | Market-configured shared clients | P | 동일 | P2 | 4 routes |
| 커뮤니티 | `/board/gear`, `/board/gear/[id]`, `/board/gear/write`, `/board/gear/[id]/edit` | ACTIVE_CONDITIONAL | 각 route `page.tsx` | Gear-configured shared clients | P | 동일 | P2 | 4 routes |
| 커뮤니티 | `/board/brands` | ACTIVE_CONDITIONAL | `app/board/brands/page.tsx` | Card/Button | L | flag on에서 레거시 card shell | P2 | 1 route |
| 커뮤니티 | `/board/hot` | ACTIVE_CONDITIONAL | `app/board/hot/page.tsx` | Card/Button | L | flag on에서 레거시 card shell | P2 | 1 route |
| 메시지 | `/messages` | ACTIVE_MEMBER | `app/messages/page.tsx` | message list/empty | P | 긴 제목·읽지 않음·모바일 action | P1 | V-10 |
| 메시지 | `/messages/write` | ACTIVE_MEMBER | `app/messages/write/page.tsx` | compose form | P | 받는 사람/보내기 CTA 및 auth redirect | P1 | |
| 알림 | `/notifications` | ACTIVE_MEMBER | `app/notifications/page.tsx` | notifications list/empty | P | 읽음/안읽음이 표면·텍스트로 충분히 구분되는지 | P1 | V-10 |
| 인증 | `/auth` | ACTIVE_PUBLIC | `app/auth/page.tsx` | auth client | L | AuthShell/Button V2 밖의 이전 인증 화면 | P1 | F-07 |
| 인증 | `/login` | ACTIVE_PUBLIC | `app/login/page.tsx` | login form/social auth | P | 조건 redirect 포함; social brand 예외 정상 | P1 | F-07 |
| 인증 | `/forgot-password` | ACTIVE_PUBLIC | `app/forgot-password/page.tsx` | AuthShell/form/result | C | AuthShell 문법 적용 | P2 | |
| 인증 | `/reset-password` | ACTIVE_PUBLIC | `app/reset-password/page.tsx` | AuthShell/form/result | C | feature result 적용 | P2 | |
| 계정 | `/account/password/change` | ACTIVE_MEMBER | `app/account/password/change/page.tsx` | password form/LoginGate | P | 성공·실패·재시도 피드백 | P1 | |
| 계정 | `/withdrawal` | ACTIVE_MEMBER | `app/withdrawal/page.tsx` | destructive confirmation | P | 위험 행동·취소 위계와 모바일 간격 회귀 확인; 작업 차단 근거 없음 | P2 | F-07 |
| 지원 | `/support` | ACTIVE_PUBLIC | `app/support/page.tsx` | support links/FAQ | P | 링크/버튼 역할과 외부 이동 안내 | P2 | F-09 |
| 정책 | `/privacy` | ACTIVE_PUBLIC | `app/privacy/page.tsx` | PublicSurface/legal content | P | 긴 본문 typography/목차 이동 | P2 | |
| 정책 | `/terms` | ACTIVE_PUBLIC | `app/terms/page.tsx` | legal content | P | privacy/refund와 shell 차 | P2 | F-07 |
| 정책 | `/refund-policy` | ACTIVE_PUBLIC | `app/refund-policy/page.tsx` | PublicSurface/legal content | P | 정책 간 typography 통일 필요 | P2 | |
| 전역 | loading/error/not-found | STATE_SURFACE | `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` | Async/Result/NotFound | P | global skeleton이 실제 홈과 불일치 | — | F-08 상태 화면 수준 P1 후보이며 route 우선순위·ACTIVE_PUBLIC 집계에서는 제외 |
| 제외 | `/admin/**` (47 route) | EXCLUDED_ADMIN | `app/admin/**/page.tsx` | 관리자 전용 | N/A | 사용자 디자인 감사 제외 | — | 발견·분류 완료 |
| 제외 | `/concept/home-benchmark` | EXCLUDED_CONCEPT | `app/concept/home-benchmark/page.tsx` | `HomeBenchmarkClient`/notFound | N/A | concept flag 및 notFound | — | 발견·분류 완료 |

### redirect matrix

| route | 실제 destination | 코드 근거 |
|---|---|---|
| `/orders` | `/mypage?tab=orders` | `app/orders/page.tsx`의 `redirect` |
| `/packages` | `/services/packages` | `app/packages/page.tsx`의 `redirect` |
| `/packages/[id]` | `/services/packages`(기존 query 보존) | `app/packages/[id]/page.tsx`의 동적 `redirect` |
| `/mypage/applications` | 비로그인: `/login?next=...`; 로그인: `/mypage?tab=orders&scope=application` | `app/mypage/applications/page.tsx`의 인증 확인 및 `redirect` |
| `/mypage/rentals` | `/mypage?tab=orders&scope=rental` | `app/mypage/rentals/page.tsx`의 `redirect` |
| `/mypage/packages` | `/mypage?tab=passes` | `app/mypage/packages/page.tsx`의 `redirect` |
| `/rackets/[id]/purchase` | `/rackets/[id]/select-string` | `app/rackets/[id]/purchase/page.tsx`의 `redirect` |
| `/rackets/[id]/rent` | `/rackets/[id]` | `app/rackets/[id]/rent/page.tsx`의 URL-encoded `redirect` |

redirect route 8개는 목적지와 별도로 한 번만 `REDIRECT_ONLY`에 집계하며 P0/P1/P2에는 넣지 않는다. purchase와 destination의 `loading.tsx`는 모두 `CommerceSelectionPageSkeleton flowType="purchase" showQuantityControls`를 사용하므로 loading 불일치가 아니다. rent에는 route-local loading이 없고 상세 destination의 상태 파일을 따른다.

### inactive/deferred matrix

| 운영 분류 | 포함 route | route 수 | 근거 |
|---|---|---:|---|
| guest order | `/order-lookup`, `/order-lookup/results`, `/order-lookup/details/[id]` | 3 | 비회원 주문 미운영; 재활성화 전까지 DEFERRED |
| Toss checkout | `/checkout/toss/fail`, `/checkout/toss/success` | 2 | TossPayments 미운영 |
| Toss package | `/services/packages/toss/fail`, `/services/packages/toss/success` | 2 | TossPayments 미운영 |
| Toss racket | `/rackets/toss/fail`, `/rackets/toss/success` | 2 | TossPayments 미운영 |

`INACTIVE 9 = guest 3 + Toss 6`이며 모두 `DEFERRED 9`와 1:1 대응한다. NicePay checkout·success·fail과 `/private-payments/**`는 활성 route다.

### dead-code 후보

| 파일/컴포넌트 | 판정 | 활성 route 집계 |
|---|---|---|
| `app/HomePageClient.tsx` | `app/page.tsx`가 `HomePageRedesign`만 import·render하고 다른 활성 경로의 import도 없는 `DEAD_CODE_CANDIDATE` | 제외(파일 후보 1, route 0) |

`HomePageClient`의 CTA/button 스타일은 `/`의 활성 문제로 세지 않는다. `HomePageRedesign`의 raw `<button>`도 캐러셀 이전·다음, 탭·필터·토글, 슬라이드 선택과 일반 command control을 핵심 CTA와 구분하며 primitive 미사용만으로 확정 위반으로 판정하지 않는다.

### 활성 route별 공통 감사 축 판정

위 매트릭스의 모든 `ACTIVE_*` 행은 다음 9축을 확인했다. 버튼은 primitive/variant/44px/wrap/ARIA, 타이포는 UI·brand 역할/weight/tracking/tabular 숫자, hero는 정보 순서와 1열 전환, surface는 Card 중첩과 모바일 평면화, 반응형은 360/390/430/768/1024/1280+, 상세는 상태→식별→결제→배송→다음 행동→보조→위험, 상태는 loading/error/empty/sold-out/success/failure/not-found, 접근성은 focus/ARIA/dialog/새 창/터치 역할이다. 행에는 이 중 사용자 영향이 큰 판정만 요약했고 확정 근거는 다음 절에 모았다.

## 4. 공용 컴포넌트 문제

### Button

- `components/ui/button.tsx`의 canonical recipe 자체는 `font-ui-medium`, focus-visible, icon shrink, highlight/inverse/favorite/destructive를 제공한다. 문제는 홈 CSS recipe와 route-local raw button/Link wrapper가 우회하는 점이다.
- 영향: `/`, `/academy/apply`, board shared clients, 상품·라켓 카드 일부, Header/SideMenu의 action-like Link. 기본 내비게이션 링크는 정상이며 “버튼처럼 보이는 경우”만 대상이다.
- inverse surface의 흰색/검정은 허용한다. `bg-black/text-white` 검색만으로 문제화하지 않았고 semantic inverse token 밖에서 action recipe를 직접 만든 경우만 기록했다.

### Hero

- `PublicPageHero`, `CommerceCatalogHero`, compact transaction hero가 있으나 products/rackets, commerce detail, transaction detail이 서로 다른 eyebrow·높이·action 순서를 쓴다.
- 영향: `/products`, `/rackets`, 두 `[id]`, services/academy, mypage 상세 전반. 마케팅 hero를 결제·주문 상세에 강제하지 말고 상세은 상태/다음 행동 우선 compact 문법으로 정리해야 한다.

### Surface / Card

- `Card`, `PublicSurface`, `SummaryCard`가 있는데 route 자체 `rounded + border + bg-card + shadow`와 feature surface 내부 추가 card가 혼재한다. 모바일에서는 행/구분선이면 충분한 요약까지 카드로 감싸 화면 폭과 위계를 소모한다.
- 영향: cart/checkout, service apply/package success, product/racket detail, 모든 mypage transaction detail, review/qna write/detail.

### Typography

- primitive는 UI font를 제공하지만 route-local `font-semibold/bold`, uppercase tracking eyebrow, `font-mono` 데이터가 산발적이다. 주문번호/가격/기간의 `tabular-nums` 적용도 화면별 편차가 있다.
- 영향: 상세/결제/성공 화면과 legal/auth. 브랜드 display를 작은 본문에 광범위하게 쓴 확정 사례보다 “공용 토큰을 우회한 임의 위계”가 주 문제다.

### Loading / ResultState

- `PageSkeletons`, route-specific loading, `ResultState`, `PaymentFailureResult`가 공존한다. NicePay fail은 잘 통합됐지만 success와 전역/loading은 실제 hero·aside·summary 구성과 1:1이 아니다.
- 영향: 전역, product/racket detail, services success, academy, transaction detail. redirect-only purchase loading은 destination과 동일해 영향에서 제외한다.

## 5. 확정 문제 목록

### F-01 — 활성 핵심 CTA의 canonical Button 우회

- **우선순위:** P1
- **사용자 route:** `/academy/apply` (community flag on의 shared board clients 포함)
- **파일/컴포넌트:** `app/academy/apply/_components/AcademyApplyClient.tsx`의 custom select/date button.
- **확인된 코드 근거:** academy selector/options가 raw button으로 자체 상태 styling을 구성한다. 홈의 캐러셀·탭·슬라이드 control은 역할상 Button CTA 강제 대상이 아니며 별도 시각 확인 대상으로만 둔다.
- **사용자 영향:** 같은 역할의 선택 control이 hover/focus/높이/wrap 계약을 호출부마다 다시 보장해야 한다.
- **위반 정책:** V2.1 “모든 CTA는 Button/buttonVariants”, 모바일 44px, action group 1열.
- **최소 수정 방향:** 이동은 `Button asChild`, command는 Button; selector는 toggle primitive 또는 `buttonVariants`와 `aria-pressed`를 사용한다. 일반 콘텐츠 링크는 바꾸지 않는다.
- **다른 영향 route:** academy 신청과 flag-on shared board control.
- **기능 회귀 위험:** 중간. carousel/event handler와 Link semantics를 유지하고 시각 recipe만 교체해야 한다.

### F-02 — COMPLETE: 상품/라켓 catalog hero 공용화

- **우선순위:** P2 회귀 확인
- **route:** `/products`, `/rackets`
- **파일/컴포넌트:** `app/products/page.tsx`, `app/rackets/page.tsx`, `CommerceCatalogHero`.
- **근거:** 두 route 모두 동일 컴포넌트에 `eyebrow`, `title`, `description`, `actions`, `guideTitle`, `guideItems` slot을 전달한다.
- **판정:** Hero 구조 공용화는 계속 `COMPLETE_STATIC`이다. 과도한 display title은 최대 64px로 제한하고, 두 열 전환은 1024px로 앞당겼으며, 모바일 guide 중첩 surface는 평면화하고 상품·라켓 대표 CTA size는 통일했다. 스트링과 라켓의 guide 문구 및 Hero 아래 도메인별 신청 안내 차이는 구조 미통일 근거가 아니다. 사용자 관점 반응형 결과는 실제 Vercel preview 시각 확인 전까지 `VISUAL_CONFIRMATION_REQUIRED`다.
- **회귀 확인:** 공용 slot 순서·responsive shell·filter query 보존과 실제 줄바꿈·action 배치·다음 영역 간격은 V-13 후속 시각 회귀 범위로 둔다. 이번 반응형 위계 조정의 시각 확인 전까지 V-13 판정과 queue 수는 유지한다.

### F-03 — commerce 상세 상단과 action panel 불균형

- **우선순위:** P1
- **route:** `/products/[id]`, `/rackets/[id]`
- **파일/컴포넌트:** product/racket detail client, gallery, option/price/purchase-rental panel.
- **근거:** 상품은 구매 중심, 라켓은 구매·대여·스트링 분기가 동일 상단에서 경쟁하며 공통 detail policy의 identity→상태→price→selection→action 순서가 다르다.
- **영향:** 라켓에서 “지금 구매 가능한지/대여 가능한지/다음 단계가 무엇인지” 즉시 파악하기 어렵다.
- **위반:** commerce detail/selection 정책, primary/secondary 위계.
- **최소 수정:** shared detail top contract를 만들되 racket availability/condition은 도메인 slot으로 유지; 한 개 primary와 명시적 secondary 선택으로 구성.
- **다른 route:** select-string, related/recent product cards.
- **회귀 위험:** 높음. 재고·가격·구매/대여 판정은 건드리지 않는 UI-only PR이어야 한다.

### F-04 — 중첩 surface와 action 과밀

- **우선순위:** P1(활성 checkout/form), P2(완료 화면 회귀)
- **route:** `/cart`, `/checkout`, `/services/apply`, `/services/packages`, `/services/packages/checkout`, `/services/packages/success`, `/reviews/write`, `/board/qna/[id]`.
- **파일/컴포넌트:** 각 page/client의 Card/PublicSurface/SummaryCard 조합.
- **근거:** 외곽 rounded/border/shadow panel 안에 동일한 rounded/border/shadow 정보 block이 반복되고 footer에 여러 action이 모인다.
- **영향:** 모바일 실폭이 줄고 정보가 모두 같은 중요도로 보일 수 있다. 실제 CTA 가림이나 작업 불가는 정적으로 확정하지 않는다.
- **위반:** 모바일 flat/full-bleed, 행/구분선 우선, action group 1열.
- **최소 수정:** 외곽 shell 하나만 유지하고 내부 요약은 definition rows/divider로 평면화; CTA는 mobile 1열, 데스크톱만 aside/sticky.
- **다른 route:** transaction detail 전체에 같은 원칙 적용 가능.
- **회귀 위험:** 중간. form field와 payment handler DOM 위치를 유지한다.

### F-05 — success/error/empty 상태 문법 불일치

- **우선순위:** P1
- **route:** checkout, rental, service, package, academy, private-payment success 및 reviews empty.
- **파일/컴포넌트:** 각 `success/page.tsx`, `ResultState`, `PaymentFailureResult`, route-local result markup.
- **근거:** NicePay failure는 공용인데 성공은 feature Card/summary/직접 icon hero가 혼재하고, 다음 행동 버튼의 variant와 위치가 다르다.
- **영향:** 결제가 완료됐는지, 주문 상세로 갈지, 재시도할지를 화면마다 다시 해석한다.
- **위반:** semantic status color, ResultState와 CTA 위계, 상세 정보 순서.
- **최소 수정:** status heading/description/primary/secondary contract를 통일하고 거래별 summary만 slot으로 둔다.
- **다른 route:** 전역 error/not-found.
- **회귀 위험:** 낮음(결제 검증/조회 로직과 분리).

### F-06 — 거래 상세의 상태·다음 행동 우선순위 부족

- **우선순위:** P1 기타, P2 주문/신청 상세 회귀 확인
- **route:** mypage order/application/academy detail, rentals/return shipping, packages, private payment, service shipping, rental checkout.
- **파일/컴포넌트:** `app/mypage/**`, checkout/shipping clients, 공용 transaction cards.
- **근거:** 식별·배송·결제 section들이 유사한 card weight로 나열되고 상태와 지금 할 행동이 compact first-view contract로 고정되지 않았다.
- **영향:** 첫 화면 탐색 부담 후보가 있으나 최근 공용 상세 적용 화면의 작업 차단은 정적으로 확인되지 않았다.
- **위반:** 상세 순서(정체→상태→번호/날짜→결제→배송→다음 행동→보조→위험), status/identity 분리.
- **최소 수정:** compact transaction header + next-action panel을 첫 section으로, 나머지는 rows; 위험 행동은 마지막 destructive 영역.
- **다른 route:** `/mypage` list cards.
- **회귀 위험:** 중간~높음. 권한·상태 machine·취소 API는 그대로 두고 presentation만 이동.

### F-07 — 인증/계정/정책 shell 편차

- **우선순위:** P1(`/auth`), P2(withdrawal·정책)
- **route:** `/auth`, `/login`, account/password, withdrawal, terms/privacy/refund.
- **파일/컴포넌트:** `AuthShell` 사용/비사용 화면, PublicSurface legal pages.
- **근거:** `/auth`는 최신 AuthShell 흐름과 분리되고 legal page별 title/surface/본문 hierarchy가 다르다.
- **영향:** 인증 경로가 다른 서비스처럼 보이고 탈퇴의 위험/취소 행동 구분이 약해질 수 있다.
- **위반:** destructive 역할, typography hierarchy, 공용 surface.
- **최소 수정:** `/auth` 운영 목적 확인 후 AuthShell 적용; 탈퇴 primary는 destructive, 안전 취소는 secondary; legal shell 공유.
- **다른 route:** LoginGate.
- **회귀 위험:** 인증 중간 redirect 때문에 중간; UI와 auth logic PR 분리.

### F-08 — 실제 화면과 skeleton 구조 불일치(완료 예외 분리)

- **우선순위:** P1
- **route:** 전역, product/racket detail, service success, academy 및 여러 mypage 상세.
- **파일/컴포넌트:** `app/**/loading.tsx`, `components/system/loading/BasePageSkeletons.tsx`, `PageSkeletons.tsx`.
- **근거:** 범용 카드/hero/aside 개수와 실제 route의 compact transaction/commerce top 구성 차이는 시각 전환 확인이 필요하다. 단 purchase redirect와 select-string은 같은 skeleton·props로 이미 통일됐다.
- **영향:** 로딩 후 레이아웃이 크게 이동하고 사용자가 예상한 정보 위치가 바뀐다.
- **위반:** skeleton은 실제 hero/column/action 구조와 일치해야 한다는 상태 정책.
- **최소 수정:** 시각 확인에서 전환 차이가 재현된 route만 shell geometry를 맞춘다. purchase redirect loading은 `COMPLETE` 회귀 확인만 수행한다.
- **다른 route:** loading 파일을 공유하는 모든 상세.
- **회귀 위험:** 낮음.

### F-09 — 링크/접근성 역할의 국소 편차

- **우선순위:** P2
- **route:** academy apply, services locations/support, qna write, icon actions 전반.
- **파일/컴포넌트:** route-local `<a>`, raw icon button, Dialog 조합.
- **근거:** academy duplicate state에서 내부 경로를 `<a>`로 직접 이동하고, 외부/전화 링크와 custom buttons의 새 창·pressed/label contract가 호출부에 의존한다.
- **영향:** client navigation 손실, screen reader가 상태·목적을 충분히 알지 못할 수 있다.
- **위반:** 링크/버튼 역할, aria-label/pressed, dialog title/description, 새 창 안내.
- **최소 수정:** 내부 이동 Link, toggle pressed, icon label, 외부 새 창 문구를 국소 보완.
- **다른 route:** Header/SideMenu icon actions.
- **회귀 위험:** 낮음.

### F-10 — community 메뉴와 실제 flag 정책 동기화

- **우선순위:** P2
- **route:** `/board`(디자인 제외), free/market/gear/brands/hot conditional routes, Header/SideMenu/Footer.
- **파일/컴포넌트:** community flag/policy, navigation menus, board redirects.
- **근거:** conditional page들은 flag off에서 `/board?closed=community`로 이동하며 board home도 별도 flag import를 사용한다.
- **영향:** 서로 다른 flag source 또는 메뉴 선노출 시 사용자는 닫힌 페이지로 이동한다.
- **위반:** destination navigation은 현재 가능한 목적지를 명확히 노출해야 함.
- **최소 수정:** UI 변경 PR 전에 flag SSOT/메뉴 노출 계약을 확인하고 한 source로 맞춘다.
- **다른 route:** 전역 navigation.
- **회귀 위험:** 중간(운영 flag); 디자인 PR과 분리.

## 6. 시각 확인 필요 목록

| ID | 후보 route/컴포넌트 | 정적 근거와 확인할 현상 | 권장 폭/방법 |
|---|---|---|---|
| V-01 | 활성 `HomePageRedesign`, Header/SideMenu | absolute media/overlay와 carousel/tab/slide control이 있어 hero/quick-nav 초점 및 긴 문구 clip 여부는 정적으로 확정 불가 | 360, 390, 430, 768, 1280px; 메뉴 open/hero slide/키보드 focus |
| V-02 | `/products/[id]` | gallery/action panel 및 loading 전환 시 높이 이동 후보 | 360/430/1024px; 긴 상품명, 옵션 품절, 관련상품 포함 |
| V-03 | `/rackets/[id]` | 구매·대여 CTA와 sticky/aside가 긴 라켓명·badge에서 밀릴 후보 | 360/390/430/1024px; 구매불가/대여가능 조합 |
| V-04 | compare | 스펙 비교의 최소 폭과 horizontal overflow/focus clip | 360/430/768px; 2~3개 라켓, 가장 긴 값 |
| V-05 | cart | 품목 footer/수량/삭제와 summary가 카드 폭에서 겹칠 후보 | 360/390/430px; 긴 이름, 최대 badge, 2개 이상 품목 |
| V-06 | checkout 3종 | sticky/fixed CTA가 마지막 약관·요약을 가릴 가능성 | 360/390/430/768/1024px; 주소 오류·키보드 open·safe-area 포함 |
| V-07 | service apply | 긴 다단계 form과 하단 footer, postcode/dialog overlay | 360/390/430px; 각 단계, validation error, 키보드 |
| V-08 | mypage | destination tabs와 7개 이상 navigation의 wrap/빈 grid cell | 360/430/768/1024px; 모든 badge/긴 사용자명 |
| V-09 | academy | `grid-cols-4 min-[390px]:grid-cols-7`, 일정/정원/긴 날짜가 390px 경계에서 높이 급변 | 360/389/390/430/768px; sold-out/중복 신청 |
| V-10 | messages/notifications | 긴 한글 제목·unread marker·action이 같은 행에서 truncate/폭 밀림 | 360/390/430px; 2줄 제목, unread/read, empty |
| V-11 | transaction details | 모바일 full-bleed negative margin과 desktop card 복원 경계 | 360/430/768/1024px; 모든 상태/다음 행동/위험 action |
| V-12 | loading 전환 | skeleton과 실제 hero/card/aside의 CLS | 360/768/1280px; throttled data로 loading→success/error 녹화 |
| V-13 | `/products`, `/rackets`, `CommerceCatalogHero` | 제한된 title 크기와 서로 다른 title·description 길이의 줄바꿈, 1024px 두 열 전환, 모바일 guide surface 평면화, 통일된 대표 CTA size, guideTitle·guideItems 높이 차이, Hero 다음 목록·필터와의 여백 및 첫 화면 상품 영역 노출을 실제 Vercel preview에서 확인 (`VISUAL_CONFIRMATION_REQUIRED`) | 360/390/430/768/1024/1280px |

모든 항목은 **후보**이며 실제 겹침이라고 단정하지 않는다. viewport screenshot, 키보드 focus 순서, 200% 확대, 긴 fixture를 함께 확인한다.

표의 `VISUAL_CONFIRMATION_REQUIRED`는 **13개 검증 queue 항목**이다. 여러 route를 한 viewport 시나리오로 묶은 항목은 독립 route 우선순위 집계와 별개이며, route matrix의 V-ID로 역산한다.

## 7. 완료된 V2 적용 항목

1. **Commerce catalog Hero — COMPLETE_STATIC:** `/products`, `/rackets`가 동일한 `CommerceCatalogHero`와 6개 slot 계약을 사용해 구조 공용화를 완료했다. 사용자 관점 반응형 결과는 `VISUAL_CONFIRMATION_REQUIRED`다.
2. **Racket purchase loading — COMPLETE:** purchase alias와 select-string destination의 skeleton component, `flowType`, quantity-control 설정이 모두 같다.
3. **NicePay failure family — COMPLETE:** checkout/private-payment/package/racket/rental NicePay fail route가 운영 결제 실패 UI를 사용한다.
4. **최근 거래 상세 공용화 — COMPLETE/P2 회귀 확인:** order/application detail은 과거 화면을 근거로 P0를 유지하지 않고 실제 공용 상세 구조의 viewport 회귀만 확인한다.

## 8. 기존 감사 문서와 현재 코드의 불일치

1. `responsive-ui-rules.md`는 `/services`와 ProductCard 긴 CTA 적용 사례를 “완료”로 들지만, academy의 custom selection recipe가 남아 “모든 CTA canonical” 완료로 확대 해석할 수 없다. 홈의 raw control은 역할·상태별 시각 확인 없이 위반으로 세지 않는다.
2. `design-system-audit.md`의 PublicPageHero/PublicSurface 기반 정리는 당시 기준이다. 현재 products/rackets Hero는 공용화가 완료됐고, transaction detail은 현재 공용 구조의 정보 순서만 회귀 확인한다.
3. badge surface 감사의 “활성 화면 최종 감사/수동 pill 0”은 badge 모양 범위에서는 유효하지만, 상태 card와 일반 card의 구분 및 CTA/타이포까지 완료했다는 뜻은 아니다.
4. `color-token-policy.md`의 academy 차단 페이지 설명과 현재 `app/academy/page.tsx`의 상세 class/contact UI는 시점이 어긋난다. 따라서 과거 운영 제외 기록으로 현재 academy 조사를 생략하지 않았다.
5. commerce 정책의 skeleton·catalog frame 공용화 기록은 현재 코드와 일치한다. redirect-only purchase loading도 destination과 동일하며, domain detail top은 별도 감사 대상이다.
6. 정책 충돌: 초기 `design-system-guidelines`는 일반 page title에 bold를 폭넓게 허용하지만 최신 typography audit/V2는 작은 한글 데이터와 body에서 UI weight를 제한한다. 최신 역할 기반 정책을 우선했다.

## 9. 우선순위

| 등급 | 확정 항목 수 | 적용 기준/영역 |
|---|---:|---|
| P0 | **0** | 현재 코드만으로 핵심 작업 차단·CTA 가림·정보 판독 불가가 확정된 route 없음 |
| P1 | **42** | 활성 checkout/form/detail/success와 명확한 공용 계약 우회 |
| P2 | **40** | 활성/conditional/role-limited의 회귀 확인·보조 UI 차이; COMPLETE 화면 포함 |
| DEFERRED | **9** | Toss 6 + 비회원 주문 3 |

개수는 route-level 권장 수정 우선순위이며 `P0 0 + P1 42 + P2 40 = 우선순위가 부여된 사용자 route 82`다. 이 82개는 `ACTIVE_PUBLIC 39 + ACTIVE_MEMBER 27 + ACTIVE_CONDITIONAL 14 + ROLE_LIMITED 2`와 정확히 같다. 묶은 community 행은 4+4+4+1+1로 펼쳤다. 전역 loading/error/not-found `STATE_SURFACE`, 공용 컴포넌트, dead-code 후보, `REDIRECT_ONLY 8`, 디자인 제외 `/board` 1, ADMIN 47, CONCEPT 1은 포함하지 않았고 INACTIVE 9는 P등급과 중복하지 않고 DEFERRED에만 넣었다.

기존 P0 7개는 모두 재검증했다. `/checkout`, `/services/apply`, `/services/packages/checkout`, `/rentals/[id]/checkout`은 sticky/footer·요약의 실제 가림이 정적 코드만으로 확정되지 않아 **P1 + VISUAL_CONFIRMATION_REQUIRED**로 하향했다. `/mypage/orders/[id]`, `/mypage/applications/[id]`는 최근 공용 상세 적용을 반영해 **P2 회귀 확인**으로 하향했다. `/withdrawal`은 위험 행동 위계·모바일 간격만으로 작업 차단이 아니어서 **P2**로 하향했다. 유지한 P0는 없으며, 따라서 확정 P0용 JSX/Tailwind 차단 근거를 꾸며 쓰지 않는다.

## 10. 수정 배치 계획

각 PR은 **1~4개의 강하게 연관된 파일**, UI-only를 원칙으로 한다. API/DB/auth/payment/order state 변경은 별도 PR이며 공용 component 변경 전에 영향 route를 PR 본문에 열거한다.

1. **시각 검증 우선:** checkout 3종과 service apply를 360~430px/safe-area/keyboard 조건에서 확인한다. 실제 작업 차단이 재현될 때만 P0 후속 PR을 연다.
2. **공용 foundation (F-01):** academy custom selection control의 44px, focus-visible, aria-pressed를 확인한다. 홈의 carousel/tab control은 CTA 치환을 선행하지 않는다.
3. **결제 안전 화면 (F-04/F-05):** 재현된 cart+checkout 문제, 이후 NicePay success family를 도메인별로 분리한다. 이미 공용인 NicePay failure는 회귀만 확인한다.
4. **거래 상세 (F-06):** order/application의 공용 상세를 먼저 회귀 확인하고 재현된 route만 rental/academy/package와 별도 처리한다.
5. **commerce detail (F-03):** 완료된 products+rackets catalog Hero와 purchase skeleton은 구현 대상에서 제외하고 상품 detail, racket detail만 별도 확인한다.
6. **서비스·패키지·대여 (F-04):** 재현된 apply surface, package cards, shipping forms만 처리하며 handler/callback DOM은 보존한다.
7. **아카데미:** 일정 selector와 success/detail을 360/389/390/430 fixture로 확인한다.
8. **후기·게시판/메시지·알림:** 활성 route부터 처리하고 conditional community는 flag-on fixture가 있을 때 P2로 확인한다.
9. **인증·고객지원·정책·전역 상태:** `/auth`, legal shell, global state 순으로 확인하며 withdrawal은 P2다.
10. **DEFERRED:** guest lookup, Toss, dead-code 후보는 활성 기능 PR에 섞지 않고 운영/삭제 결정 시 별도 감사한다.

요청의 기본 순서보다 commerce를 4번에 배치한 이유는 결제 및 거래 상세의 사용자 안전·다음 행동을 마케팅 hero보다 우선하기 위해서다. 공용 component PR은 예상 영향 route snapshot 목록을 먼저 고정하고, 완료 조건에 실제/로딩 동형성을 포함한다.

## 11. 집계 검증 결과

| 검증 항목 | 결과 |
|---|---:|
| 전체 `page.tsx` 수 | **148** |
| 분류된 route 수 | **148** |
| 미분류 route 수 | **0** |
| 중복 분류 route 수 | **0** |
| ACTIVE_PUBLIC | **39** |
| ACTIVE_MEMBER | **27** |
| ACTIVE_CONDITIONAL | **14** |
| ROLE_LIMITED | **2** |
| REDIRECT_ONLY | **8** |
| INACTIVE | **9** |
| ADMIN | **47** |
| CONCEPT | **1** |
| 디자인 제외 public shell | **1** |
| P0 / P1 / P2 / DEFERRED | **0 / 42 / 40 / 9** |
| 활성 우선순위 route | **82** |
| VISUAL_CONFIRMATION_REQUIRED | **13개 검증 queue 항목** |
| DEAD_CODE_CANDIDATE | **1개 파일 / 0 route** |
| 상태 파일 | **99** (`loading.tsx` 96 + `error.tsx` 2 + `not-found.tsx` 1) |

route 분류식은 `148 = 39 + 27 + 14 + 2 + 8 + 9 + 47 + 1 + 1`이다. 우선순위 식은 `82 = 42 + 40 = 39 + 27 + 14 + 2`이고 P0는 0이다. 전역 loading/error/not-found `STATE_SURFACE`와 공용 컴포넌트는 route 우선순위에 포함하지 않았으며 상태 파일도 page route로 중복 계산하지 않았다.

## 12. 최종 마감 기준

- [x] 활성 및 조건부 사용자 route 미조사 **0** (제외/비활성도 이유 기록)
- [ ] 활성 route `LEGACY 0` — 현재 `/auth`가 남아 후속 필요
- [x] `P0 0` — 기존 7개 후보는 정적 차단 근거가 없어 P1/P2 및 시각 확인으로 재분류
- [x] 확인 없이 과거 기록을 현재 “완료”로 인정한 주장 **0**
- [x] 모든 `VISUAL_CONFIRMATION_REQUIRED`에 폭과 방법 존재
- [x] 공용 Button/Hero/Surface/Typography/Loading 영향 범위 기록
- [x] 비활성 Toss/비회원과 활성 NicePay 분리
- [x] 관리자/concept/board 디자인 제외 이유 기록

최종 구현 마감은 시각 확인 결과를 각 후속 PR 증거에 붙이고, 활성 route의 LEGACY/P0를 0으로 만든 뒤 이 문서의 route matrix를 다시 대조하는 시점이다.
