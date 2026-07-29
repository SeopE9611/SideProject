# 사용자 접근 페이지 디자인 V2 최종 감사

## 1. 감사 기준

- **기준 브랜치 / 커밋:** `work` / `3c4faf6ede81aec8e303e6b3c5a69e569fd7b354` (2026-07-29 정적 코드 기준). 원격 `main` 갱신이나 실행 환경을 변경하지 않고, 제공된 “PR #2303 병합 상태”의 현재 작업 트리를 기준으로 삼았다.
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
| redirect-only | **5** | `/orders`, `/packages`, `/packages/[id]`, racket purchase/rent |
| inactive-operation | **9** | 비회원 조회 3 + Toss 6 |
| 실제 감사 ACTIVE_PUBLIC | **45** | 비로그인 렌더 가능 화면 |
| 실제 감사 ACTIVE_MEMBER | **24** | 인증/소유권이 필요한 화면 |
| ACTIVE_CONDITIONAL | **14** | community flag route |
| ROLE_LIMITED | **2** | notice/event write |
| 디자인 제외 public shell | **1** | `/board` (운영 요청에 따른 N/A) |
| loading/error/not-found 상태 파일 | **99** | admin/concept 포함 발견 수; 활성 사용자 state도 대응 route와 함께 검토 |
| 최종 미조사 route | **0** | 148 = 47+1+5+9+45+24+14+2+1 |

`loading/error/not-found` 99개는 독립 route가 아니라 부모 route의 상태로 조사했다. 전역 `loading.tsx`, `error.tsx`, `not-found.tsx`, 서비스 성공 error 및 각 route loading을 포함한다.

## 3. 전체 라우트 매트릭스

표의 “핵심 컴포넌트”는 page가 직접 렌더하거나 공용 상태를 구성하는 진입점이다. `—`는 page 자체 렌더링이다. `C`=COMPLETE, `P`=PARTIAL, `L`=LEGACY, `N/A`=NOT_APPLICABLE이다.

| 영역 | 라우트 | 접근 상태 | 실제 렌더링 파일 | 연결된 핵심 컴포넌트 | V2 | 주요 판정 | 우선순위 | 비고 |
|---|---|---|---|---|---|---|---|---|
| 홈 | `/` | ACTIVE_PUBLIC | `app/page.tsx` | `HomePageClient`/`HomePageRedesign`, Header·SideMenu·Footer | P | 공용 Button recipe 밖 Link/raw button과 두 홈 구현의 문법 분기 | P1 | F-01, V-01 |
| 상품 | `/products` | ACTIVE_PUBLIC | `app/products/page.tsx` | `ProductsClient`, `CommerceCatalogHero`, `ProductCard` | P | discovery는 V2이나 racket hero와 구성 차 | P1 | F-02 |
| 상품 | `/products/[id]` | ACTIVE_PUBLIC | `app/products/[id]/page.tsx` | `ProductDetailClient`, gallery/purchase panel/related | P | 상단·구매 panel surface 밀도, skeleton 대응 확인 필요 | P1 | F-03, V-02 |
| 상품 | `/products/recommend` | ACTIVE_PUBLIC | `app/products/recommend/page.tsx` | 추천 폼/결과 카드 | P | 선택 CTA·결과/빈 상태 위계 부분 적용 | P2 | |
| 라켓 | `/rackets` | ACTIVE_PUBLIC | `app/rackets/page.tsx` | `RacketsClient`, racket card | P | product catalog와 hero 문법 불일치 | P1 | F-02 |
| 라켓 | `/rackets/[id]` | ACTIVE_PUBLIC | `app/rackets/[id]/page.tsx` | detail client/gallery/action panel | P | 구매·대여·스트링 CTA 경쟁 | P1 | F-03, V-03 |
| 라켓 | `/rackets/compare` | ACTIVE_PUBLIC | `app/rackets/compare/page.tsx` | compare client/store, skeleton | P | 좁은 폭 비교표/고정 열 확인 필요 | P1 | V-04 |
| 라켓 | `/rackets/finder` | ACTIVE_PUBLIC | `app/rackets/finder/page.tsx` | finder client/result cards | P | 단계 CTA와 결과 action 위계 혼재 | P2 | |
| 라켓 흐름 | `/rackets/[id]/purchase` | REDIRECT_ONLY | `app/rackets/[id]/purchase/page.tsx` | `redirect` | N/A | 별도 UI 없이 select-string으로 이동 | — | loading은 목적지 구조와 다름(F-08) |
| 라켓 흐름 | `/rackets/[id]/rent` | REDIRECT_ONLY | `app/rackets/[id]/rent/page.tsx` | `redirect` | N/A | 별도 UI 없이 대여 string 선택으로 이동 | — | |
| 라켓 흐름 | `/rackets/[id]/select-string` | ACTIVE_PUBLIC | `app/rackets/[id]/select-string/page.tsx` | select-string client/LoginGate | P | 조건 선택·다음 행동 밀도 | P1 | 비회원 mode off 시 gate |
| 라켓 흐름 | `/rentals/[id]/select-string` | ACTIVE_MEMBER | `app/rentals/[id]/select-string/page.tsx` | rental select client/LoginGate | P | 소유권·상태 안내와 선택 UI 결합 | P1 | F-06 |
| 라켓 흐름 | `/racket-orders/[orderId]/select-string` | ACTIVE_MEMBER | `app/racket-orders/[orderId]/select-string/page.tsx` | `SelectStringClient`, LoginGate | P | guest 분기는 운영 off, 본인/관리자만 | P1 | |
| 장바구니 | `/cart` | ACTIVE_PUBLIC | `app/cart/page.tsx` | Cart client/items/summary | P | summary/card 중첩과 모바일 action 밀도 | P1 | F-04, V-05 |
| 결제 | `/checkout` | ACTIVE_MEMBER | `app/checkout/page.tsx` | checkout form/order summary/NicePay | P | sticky CTA·요약 중첩 위험 | P0 | F-04, V-06 |
| 결제 | `/checkout/success` | ACTIVE_MEMBER | `app/checkout/success/page.tsx` | ResultState, order summary | P | 성공 이후 핵심 행동보다 세부 card가 큼 | P1 | F-05 |
| 결제 | `/checkout/nice/fail` | ACTIVE_PUBLIC | `app/checkout/nice/fail/page.tsx` | `PaymentFailureResult` | C | 운영 실패 공용 결과 사용 | P2 | 문구/재시도 목적지만 회귀 확인 |
| 결제 | `/checkout/toss/fail` | INACTIVE_OPERATION | `app/checkout/toss/fail/page.tsx` | failure result | N/A | Toss 미운영 | DEFERRED | 삭제 단정 금지 |
| 결제 | `/checkout/toss/success` | INACTIVE_OPERATION | `app/checkout/toss/success/page.tsx` | Toss confirmation | N/A | Toss 미운영 | DEFERRED | |
| 개인결제 | `/private-payments/[id]` | ACTIVE_MEMBER | `app/private-payments/[id]/page.tsx` | private payment detail/NicePay | P | 금액·기한·결제 CTA 우선순위 개선 | P1 | F-06 |
| 개인결제 | `/private-payments/success` | ACTIVE_MEMBER | `app/private-payments/success/page.tsx` | ResultState/summary | P | 성공 state 계열 간 surface 차 | P1 | F-05 |
| 개인결제 | `/private-payments/nice/fail` | ACTIVE_PUBLIC | `app/private-payments/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 공용 실패 | P2 | |
| 서비스 | `/services` | ACTIVE_PUBLIC | `app/services/page.tsx` | service hero/cards/CTA | P | V2 적용, 긴 CTA와 surface 반복 잔여 | P1 | F-04 |
| 서비스 | `/services/apply` | ACTIVE_MEMBER | `app/services/apply/page.tsx` | `ApplyHero`, steps/footer, NicePay button | P | 1,800+줄 단계 폼, 내부 요약 card 반복 | P0 | F-04, V-07 |
| 서비스 | `/services/success` | ACTIVE_MEMBER | `app/services/success/page.tsx` | result/summary + local error/loading | P | 정상·error·loading 구조 차 | P1 | F-05/F-08 |
| 서비스 | `/services/pricing` | ACTIVE_PUBLIC | `app/services/pricing/page.tsx` | PublicPageHero/pricing cards | C | 정보형 V2 문법 양호 | P2 | |
| 서비스 | `/services/locations` | ACTIVE_PUBLIC | `app/services/locations/page.tsx` | location cards/map links | P | 외부 링크 새 창 안내 점검 | P2 | F-09 |
| 서비스 | `/services/tension-guide` | ACTIVE_PUBLIC | `app/services/tension-guide/page.tsx` | guide/result panels | P | 정보 card 중첩·작은 데이터 위계 | P2 | |
| 서비스 | `/services/applications/[id]/shipping` | ACTIVE_MEMBER | `app/services/applications/[id]/shipping/page.tsx` | shipping form/LoginGate | P | 주소·배송 다음 행동이 compact hero와 분리 | P1 | F-06 |
| 패키지 | `/services/packages` | ACTIVE_PUBLIC | `app/services/packages/page.tsx` | `StringPackagesPageClient`, `UnifiedPackageCard` | P | 카드 CTA 반복/가격·횟수 위계 | P1 | F-04 |
| 패키지 | `/services/packages/checkout` | ACTIVE_MEMBER | `app/services/packages/checkout/page.tsx` | `PackageCheckoutClient`, LoginGate | P | 중첩 요약과 CTA 하단 위험 | P0 | F-04, V-06 |
| 패키지 | `/services/packages/success` | ACTIVE_MEMBER | `app/services/packages/success/page.tsx` | ResultState/SummaryCard/UnifiedPackageCard | P | 성공 화면 안 feature card 중첩 | P1 | F-05 |
| 패키지 | `/services/packages/nice/fail` | ACTIVE_PUBLIC | `app/services/packages/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 실패 | P2 | |
| 패키지 | `/services/packages/toss/fail` | INACTIVE_OPERATION | `app/services/packages/toss/fail/page.tsx` | failure result | N/A | Toss 미운영 | DEFERRED | |
| 패키지 | `/services/packages/toss/success` | INACTIVE_OPERATION | `app/services/packages/toss/success/page.tsx` | redirect/loading client | N/A | Toss 미운영 | DEFERRED | |
| 패키지 별칭 | `/packages` | REDIRECT_ONLY | `app/packages/page.tsx` | `redirect('/services/packages')` | N/A | canonical 이동 | — | |
| 패키지 별칭 | `/packages/[id]` | REDIRECT_ONLY | `app/packages/[id]/page.tsx` | `redirect` | N/A | query 보존 canonical 이동 | — | |
| 케어 | `/racket-care` | ACTIVE_PUBLIC | `app/racket-care/page.tsx` | racket-care V2 hero | C | V2 대표 구현 | P2 | 상태색 분리 유지 |
| 케어 | `/mypage/racket-care` | ACTIVE_MEMBER | `app/mypage/racket-care/page.tsx` | member care dashboard | P | compact 업무 hero/상태/행동 밀도 | P1 | F-06 |
| 대여 | `/rentals/[id]/checkout` | ACTIVE_MEMBER | `app/rentals/[id]/checkout/page.tsx` | rental checkout/NicePay | P | 기간·보증금·배송·총액 분산 | P0 | F-06, V-06 |
| 대여 | `/rentals/success` | ACTIVE_MEMBER | `app/rentals/success/page.tsx` | result/rental summary | P | 성공 화면 공용 문법 불완전 | P1 | F-05 |
| 대여 | `/rentals/nice/fail` | ACTIVE_PUBLIC | `app/rentals/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 실패 | P2 | |
| 마이페이지 | `/mypage` | ACTIVE_MEMBER | `app/mypage/page.tsx` | dashboard/tabs/transaction cards | P | destination과 정보 카드 다층 구조 | P1 | F-06, V-08 |
| 마이페이지 | `/mypage/profile` | ACTIVE_MEMBER | `app/mypage/profile/page.tsx` | profile form | P | save/cancel 위계와 상태 피드백 | P2 | |
| 주문 상세 | `/mypage/orders/[id]` | ACTIVE_MEMBER | `app/mypage/orders/[id]/page.tsx` | order detail/transaction sections | P | 상태→다음 행동보다 card section이 먼저 경쟁 | P0 | F-06 |
| 대여 | `/mypage/rentals` | ACTIVE_MEMBER | `app/mypage/rentals/page.tsx` | rentals list/cards | P | 상태·기간·반납 action footer 밀도 | P1 | F-06 |
| 대여 | `/mypage/rentals/[id]/return-shipping` | ACTIVE_MEMBER | `app/mypage/rentals/[id]/return-shipping/page.tsx` | return shipping form | P | 위험/보조/제출 action 분리 필요 | P1 | F-06 |
| 교체 | `/mypage/applications` | ACTIVE_MEMBER | `app/mypage/applications/page.tsx` | application list/cards | P | 거래 카드 문법 차 | P1 | F-06 |
| 교체 상세 | `/mypage/applications/[id]` | ACTIVE_MEMBER | `app/mypage/applications/[id]/page.tsx` | application detail | P | 배송/결제/다음 행동 정보 순서 | P0 | F-06 |
| 아카데미 상세 | `/mypage/academy-applications/[id]` | ACTIVE_MEMBER | `app/mypage/academy-applications/[id]/page.tsx` | academy application detail | P | 일정 긴 줄·상태와 취소 action 경쟁 | P1 | F-06, V-09 |
| 패키지 | `/mypage/packages` | ACTIVE_MEMBER | `app/mypage/packages/page.tsx` | package ownership/cards | P | 잔여 횟수와 사용 행동 우선순위 | P1 | F-06 |
| 인증 별칭 | `/orders` | REDIRECT_ONLY | `app/orders/page.tsx` | `redirect('/mypage?tab=orders')` | N/A | UI 없음 | — | |
| 비회원 | `/order-lookup` | INACTIVE_OPERATION | `app/order-lookup/page.tsx` | lookup form | L | 비회원 미운영, 레거시 정적 UI | DEFERRED | |
| 비회원 | `/order-lookup/results` | INACTIVE_OPERATION | `app/order-lookup/results/page.tsx` | result list | L | 비회원 미운영 | DEFERRED | |
| 비회원 | `/order-lookup/details/[id]` | INACTIVE_OPERATION | `app/order-lookup/details/[id]/page.tsx` | guest detail | L | 비회원 미운영 | DEFERRED | |
| 라켓 결제 | `/rackets/nice/fail` | ACTIVE_PUBLIC | `app/rackets/nice/fail/page.tsx` | `PaymentFailureResult` | C | 활성 NicePay 실패 | P2 | |
| 라켓 결제 | `/rackets/toss/fail` | INACTIVE_OPERATION | `app/rackets/toss/fail/page.tsx` | failure result | N/A | Toss 미운영 | DEFERRED | |
| 라켓 결제 | `/rackets/toss/success` | INACTIVE_OPERATION | `app/rackets/toss/success/page.tsx` | Toss confirmation | N/A | Toss 미운영 | DEFERRED | |
| 아카데미 | `/academy` | ACTIVE_PUBLIC | `app/academy/page.tsx` | class/contact/guide cards | P | 운영 데이터에 따라 소개/차단 분기; 일정 행 밀도 | P1 | V-09 |
| 아카데미 | `/academy/apply` | ACTIVE_MEMBER | `app/academy/apply/page.tsx` | `AcademyApplyClient` | P | custom raw selector buttons, 날짜 4→7열 | P1 | F-01, V-09 |
| 아카데미 | `/academy/apply/success` | ACTIVE_MEMBER | `app/academy/apply/success/page.tsx` | result/detail list | P | 다른 success와 surface 불일치 | P1 | F-05 |
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
| 계정 | `/withdrawal` | ACTIVE_MEMBER | `app/withdrawal/page.tsx` | destructive confirmation | P | 위험 행동과 취소 위계/모바일 간격 | P0 | F-07 |
| 지원 | `/support` | ACTIVE_PUBLIC | `app/support/page.tsx` | support links/FAQ | P | 링크/버튼 역할과 외부 이동 안내 | P2 | F-09 |
| 정책 | `/privacy` | ACTIVE_PUBLIC | `app/privacy/page.tsx` | PublicSurface/legal content | P | 긴 본문 typography/목차 이동 | P2 | |
| 정책 | `/terms` | ACTIVE_PUBLIC | `app/terms/page.tsx` | legal content | P | privacy/refund와 shell 차 | P2 | F-07 |
| 정책 | `/refund-policy` | ACTIVE_PUBLIC | `app/refund-policy/page.tsx` | PublicSurface/legal content | P | 정책 간 typography 통일 필요 | P2 | |
| 전역 | loading/error/not-found | ACTIVE_PUBLIC | `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` | Async/Result/NotFound | P | global skeleton이 실제 홈과 불일치 | P1 | F-08 |
| 제외 | `/admin/**` (47 route) | EXCLUDED_ADMIN | `app/admin/**/page.tsx` | 관리자 전용 | N/A | 사용자 디자인 감사 제외 | — | 발견·분류 완료 |
| 제외 | `/concept/home-benchmark` | EXCLUDED_CONCEPT | `app/concept/home-benchmark/page.tsx` | `HomeBenchmarkClient`/notFound | N/A | concept flag 및 notFound | — | 발견·분류 완료 |

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
- 영향: 전역, product/racket detail, redirect-only purchase loading, services success, academy, transaction detail. skeleton은 장식 수준이 아니라 실제 정보 순서와 열 수를 맞춰야 한다.

## 5. 확정 문제 목록

### F-01 — canonical Button 우회

- **우선순위:** P1
- **사용자 route:** `/`, `/academy/apply` (community flag on의 shared board clients 포함)
- **파일/컴포넌트:** `app/HomePageClient.tsx`의 `homeCta*` Link/raw button, `app/HomePageRedesign.tsx`의 action Link/raw carousel/filter button, `app/academy/apply/_components/AcademyApplyClient.tsx`의 custom select/date button.
- **확인된 코드 근거:** CTA class를 Link와 `<button>`에 직접 부여하고, academy selector/options도 raw button으로 자체 상태 styling을 구성한다.
- **사용자 영향:** 같은 중요도의 CTA가 hover/focus/높이/wrap에서 달라지고 360px 긴 한글 문구의 최소 터치 영역을 호출부마다 다시 보장해야 한다.
- **위반 정책:** V2.1 “모든 CTA는 Button/buttonVariants”, 모바일 44px, action group 1열.
- **최소 수정 방향:** 이동은 `Button asChild`, command는 Button; selector는 toggle primitive 또는 `buttonVariants`와 `aria-pressed`를 사용한다. 일반 콘텐츠 링크는 바꾸지 않는다.
- **다른 영향 route:** 홈 공용 영역을 소비하는 모든 방문, academy 신청.
- **기능 회귀 위험:** 중간. carousel/event handler와 Link semantics를 유지하고 시각 recipe만 교체해야 한다.

### F-02 — 상품/라켓 catalog hero 문법 분기

- **우선순위:** P1
- **route:** `/products`, `/rackets`
- **파일/컴포넌트:** 두 page가 연결하는 catalog clients, `CommerceCatalogHero` 및 racket-specific hero/filter shell.
- **근거:** 동일 discovery 성격인데 title/description/guide/filter 진입 순서와 hero surface가 별도 구현이다.
- **사용자 영향:** 두 카탈로그를 오갈 때 검색/필터의 위치와 페이지 범위를 다시 학습한다.
- **위반 정책:** commerce discovery의 결과 panel·toolbar·filter shell 공용 문법, 모바일 1열.
- **최소 수정:** 도메인 데이터와 badge는 유지하고 hero slot 순서와 높이, filter 진입점만 공용 API로 수렴.
- **다른 route:** `/products/recommend`, `/rackets/finder`의 discovery 진입 링크.
- **회귀 위험:** 낮음~중간(필터 query 보존).

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

- **우선순위:** P0(결제), P1(나머지)
- **route:** `/cart`, `/checkout`, `/services/apply`, `/services/packages`, `/services/packages/checkout`, `/services/packages/success`, `/reviews/write`, `/board/qna/[id]`.
- **파일/컴포넌트:** 각 page/client의 Card/PublicSurface/SummaryCard 조합.
- **근거:** 외곽 rounded/border/shadow panel 안에 동일한 rounded/border/shadow 정보 block이 반복되고 footer에 여러 action이 모인다.
- **영향:** 모바일 실폭이 줄고 정보가 모두 같은 중요도로 보여 총액·제출·다음 행동을 찾기 어렵다.
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

- **우선순위:** P0 주문/신청, P1 기타
- **route:** mypage order/application/academy detail, rentals/return shipping, packages, private payment, service shipping, rental checkout.
- **파일/컴포넌트:** `app/mypage/**`, checkout/shipping clients, 공용 transaction cards.
- **근거:** 식별·배송·결제 section들이 유사한 card weight로 나열되고 상태와 지금 할 행동이 compact first-view contract로 고정되지 않았다.
- **영향:** 첫 화면에서 현재 상태 및 해야 할 일을 놓쳐 결제·발송·반납 지연 가능성이 있다.
- **위반:** 상세 순서(정체→상태→번호/날짜→결제→배송→다음 행동→보조→위험), status/identity 분리.
- **최소 수정:** compact transaction header + next-action panel을 첫 section으로, 나머지는 rows; 위험 행동은 마지막 destructive 영역.
- **다른 route:** `/mypage` list cards.
- **회귀 위험:** 중간~높음. 권한·상태 machine·취소 API는 그대로 두고 presentation만 이동.

### F-07 — 인증/계정/정책 shell 편차

- **우선순위:** P1(`/auth`, withdrawal), P2(정책)
- **route:** `/auth`, `/login`, account/password, withdrawal, terms/privacy/refund.
- **파일/컴포넌트:** `AuthShell` 사용/비사용 화면, PublicSurface legal pages.
- **근거:** `/auth`는 최신 AuthShell 흐름과 분리되고 legal page별 title/surface/본문 hierarchy가 다르다.
- **영향:** 인증 경로가 다른 서비스처럼 보이고 탈퇴의 위험/취소 행동 구분이 약해질 수 있다.
- **위반:** destructive 역할, typography hierarchy, 공용 surface.
- **최소 수정:** `/auth` 운영 목적 확인 후 AuthShell 적용; 탈퇴 primary는 destructive, 안전 취소는 secondary; legal shell 공유.
- **다른 route:** LoginGate.
- **회귀 위험:** 인증 중간 redirect 때문에 중간; UI와 auth logic PR 분리.

### F-08 — 실제 화면과 skeleton 구조 불일치

- **우선순위:** P1
- **route:** 전역, product/racket detail, service success, academy, redirect-only purchase 및 여러 mypage 상세.
- **파일/컴포넌트:** `app/**/loading.tsx`, `components/system/loading/BasePageSkeletons.tsx`, `PageSkeletons.tsx`.
- **근거:** 범용 카드/hero/aside 개수와 실제 route의 compact transaction/commerce top 구성이 다르며 redirect-only route에도 독립 상세형 loading이 남는다.
- **영향:** 로딩 후 레이아웃이 크게 이동하고 사용자가 예상한 정보 위치가 바뀐다.
- **위반:** skeleton은 실제 hero/column/action 구조와 일치해야 한다는 상태 정책.
- **최소 수정:** route별 shell geometry만 일치시키고 data-dependent 세부는 단순 skeleton; redirect-only loading은 실제 목적지와 공유.
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
| V-01 | 홈 두 구현, Header/SideMenu | absolute media/overlay와 CSS CTA recipe가 많아 hero/quick-nav 초점 및 긴 문구 clip 여부는 정적으로 확정 불가 | 360, 390, 430, 768, 1280px; 메뉴 open/hero slide/키보드 focus |
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

모든 항목은 **후보**이며 실제 겹침이라고 단정하지 않는다. viewport screenshot, 키보드 focus 순서, 200% 확대, 긴 fixture를 함께 확인한다.

## 7. 기존 감사 문서와 현재 코드의 불일치

1. `responsive-ui-rules.md`는 `/services`와 ProductCard 긴 CTA 적용 사례를 “완료”로 들지만, 전체 활성 CTA에는 홈/academy의 raw recipe가 남아 “모든 CTA canonical” 완료로 확대 해석할 수 없다.
2. `design-system-audit.md`의 PublicPageHero/PublicSurface 기반 정리는 당시 기준이다. 현재 products/rackets hero와 transaction detail은 공용 primitive를 일부 쓰면서도 정보 순서/중첩 surface가 다르다.
3. badge surface 감사의 “활성 화면 최종 감사/수동 pill 0”은 badge 모양 범위에서는 유효하지만, 상태 card와 일반 card의 구분 및 CTA/타이포까지 완료했다는 뜻은 아니다.
4. `color-token-policy.md`의 academy 차단 페이지 설명과 현재 `app/academy/page.tsx`의 상세 class/contact UI는 시점이 어긋난다. 따라서 과거 운영 제외 기록으로 현재 academy 조사를 생략하지 않았다.
5. commerce 정책은 skeleton·catalog frame 공용화를 완료 단계로 기록하지만 redirect-only purchase loading 및 domain detail top의 구조까지 동일해진 것은 아니다.
6. 정책 충돌: 초기 `design-system-guidelines`는 일반 page title에 bold를 폭넓게 허용하지만 최신 typography audit/V2는 작은 한글 데이터와 body에서 UI weight를 제한한다. 최신 역할 기반 정책을 우선했다.

## 8. 우선순위

| 등급 | 확정 항목 수 | 적용 기준/영역 |
|---|---:|---|
| P0 | **5** | checkout, service apply, package checkout, rental checkout, order/application detail의 CTA·다음 행동·가림 위험. 시각 확인 전 “실제 가림 확정”은 아님 |
| P1 | **31** | 활성 page의 PARTIAL/LEGACY, hero/detail/success/loading/타입 위계 |
| P2 | **35** | 활성/conditional/role-limited의 완성도·접근성·미세 일관성(완료 화면도 회귀 확인 포함) |
| DEFERRED | **9** | Toss 6 + 비회원 주문 3 |

개수는 route-level 권장 수정 우선순위이며 한 issue가 여러 route에 영향을 줄 수 있어 F-ID 수와 같지 않다. `REDIRECT_ONLY`, 제외 49개는 수정 우선순위 집계에서 제외했다. P0는 “정적 위험을 곧바로 결함으로 확정”한 수가 아니라 결제/다음 행동을 우선 검증·수정해야 하는 route 수다.

## 9. 수정 배치 계획

각 PR은 **1~4개의 강하게 연관된 파일**, UI-only를 원칙으로 한다. API/DB/auth/payment/order state 변경은 별도 PR이며 공용 component 변경 전에 영향 route를 PR 본문에 열거한다.

1. **공용 foundation (F-01):** Button/buttonVariants 우회가 명확한 홈 CTA recipe 또는 academy custom control을 각각 별도 1~3파일 PR로 처리. 완료 조건은 44px, focus-visible, aria-pressed, 긴 CTA 360px 확인.
2. **결제 안전 화면 (F-04/F-05):** cart+checkout shell, 이후 NicePay success/failure family, package/rental checkout을 도메인별 PR로 분리. 완료 조건은 총액/결제 CTA/약관이 첫 위계이고 360~430px safe-area에서 가리지 않는 것.
3. **거래 상세 (F-06):** order detail → application detail → rental/academy/package 순. 각 1~4파일. 상태/식별/금액/배송/다음 행동/보조/위험 순서와 skeleton 일치를 완료 조건으로 한다.
4. **commerce discovery/detail (F-02/F-03):** products+rackets catalog hero contract를 먼저, 상품 detail, racket detail을 별도 PR로 한다. 재고·가격·구매/대여 로직 무변경이 조건.
5. **서비스·패키지·대여 (F-04):** apply step별 surface 평면화, package cards, shipping forms. form handler/결제 callback DOM은 보존한다.
6. **아카데미:** 일정 selector와 success/detail. 360/389/390/430 fixture 확인 및 sold-out/중복 상태가 텍스트로 전달되어야 한다.
7. **후기·게시판:** review write, qna detail/write, notice/event shared clients. community conditional은 flag-on fixture를 마련한 뒤 별도 P2; `/board` 디자인은 제외 유지.
8. **메시지·알림:** list row/unread/empty/action. 긴 제목 2줄, 44px icon action, screen-reader unread label을 완료 조건으로 한다.
9. **인증·고객지원·정책·전역 상태:** `/auth` 목적 확인 후 AuthShell, withdrawal destructive hierarchy, legal shell, global loading/error/not-found 순.
10. **DEFERRED:** guest lookup과 Toss는 활성 기능 PR에 섞지 않고 운영 재개 결정 시 별도 audit/PR.

요청의 기본 순서보다 commerce를 4번에 배치한 이유는 결제 및 거래 상세의 사용자 안전·다음 행동을 마케팅 hero보다 우선하기 위해서다. 공용 component PR은 예상 영향 route snapshot 목록을 먼저 고정하고, 완료 조건에 실제/로딩 동형성을 포함한다.

## 10. 최종 마감 기준

- [x] 활성 및 조건부 사용자 route 미조사 **0** (제외/비활성도 이유 기록)
- [ ] 활성 route `LEGACY 0` — 현재 `/auth`가 남아 후속 필요
- [ ] `P0 0` — 결제/거래 상세 5개 route 우선 검증·수정 필요
- [x] 확인 없이 과거 기록을 현재 “완료”로 인정한 주장 **0**
- [x] 모든 `VISUAL_CONFIRMATION_REQUIRED`에 폭과 방법 존재
- [x] 공용 Button/Hero/Surface/Typography/Loading 영향 범위 기록
- [x] 비활성 Toss/비회원과 활성 NicePay 분리
- [x] 관리자/concept/board 디자인 제외 이유 기록

최종 구현 마감은 시각 확인 결과를 각 후속 PR 증거에 붙이고, 활성 route의 LEGACY/P0를 0으로 만든 뒤 이 문서의 route matrix를 다시 대조하는 시점이다.
