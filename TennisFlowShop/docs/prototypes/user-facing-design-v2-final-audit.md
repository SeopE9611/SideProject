# 사용자 접근 페이지 디자인 V2 최종 감사

## 1. 기준과 조사 방법

- **기준 브랜치/커밋:** 최신 `main`, `fd39c32` (`Merge pull request #2326 ...`). 따라서 PR #2325 병합 커밋을 포함한 상태를 기준으로 조사했다.
- `app/**/{page,layout,loading,error,not-found}.tsx`를 수집한 뒤 `components/header.tsx`, `components/nav/DesktopHeaderNavigation.tsx`, `components/nav/nav.config.ts`, `components/footer.tsx`, 홈 CTA/카드 구현과 각 page가 import하는 Client Component를 교차 확인했다.
- V2 판단 기준은 `docs/dokkaebi-design-system-v2.md`, `docs/design-system-guidelines.md`, `docs/dokkaebi-v2-interaction-responsive-policy.md`와 공용 `Button`, `Card`, `ResultState`, checkout/public 컴포넌트로 삼았다.
- raw 검정/흰색 CTA, 직접 작성한 button, font weight, radius, 고정 크기, 표준 breakpoint를 검색하되 이미지 제어, 아이콘, destructive/역상 영역, 입력 보조 컨트롤은 문맥을 읽고 기계적으로 바꾸지 않았다.

## 2. 실제 접근 경로 및 판정

| 경로군 | 실제 경로 | 대표 page / Client Component | 접근 근거 | 상태 및 근거 |
| --- | --- | --- | --- | --- |
| 메인 | `/` | `app/page.tsx`, `app/HomePageRedesign.tsx`, `app/HomePageClient.tsx` | 헤더 로고, 홈 Hero/퀵 링크/슬라이드·상품·라켓·패키지 카드 | 통과. CTA는 상품, 추천, 서비스, 라켓, 아카데미, 라켓 케어, 패키지, 리뷰, 공지로 연결된다. |
| 스트링 탐색 | `/products`, `/products/[id]`, `/products/recommend` | `FilterableProductList`, `ProductDetailClient`, `StringRecommendClient` | 데스크톱/모바일 상품 메뉴, 홈 상품 카드·CTA | 통과. 목록/상세/추천, 빈 결과와 loading 포함. |
| 라켓 케어 | `/racket-care` | `app/racket-care/page.tsx` | 서비스 안내 및 사용자 라켓 관리 흐름 | 통과. 실제 활성 사용자 경로를 PR #2326 목록에서 누락해 이번 정정에서 추가했다. |
| 라켓·중고 라켓 | `/rackets`, `/rackets/[id]`, `/rackets/finder`, `/rackets/compare`, `/rackets/[id]/purchase`, `/rackets/[id]/rent`, `/rackets/[id]/select-string`, `/racket-orders/[orderId]/select-string` | `RacketsPageClient`, `RacketDetailClient`, finder/compare Client, 구매·대여·스트링 선택 Client | 헤더 라켓 메뉴, 홈 라켓 카드, 상세 실행 CTA | 통과. 판매/중고 상태는 목록 필터와 상세에서 함께 노출된다. **수정:** 구매 checkout의 NicePay·무통장 실제 결제 CTA를 `highlight`/`tall`로 통일했다. |
| 대여 흐름 | `/rentals/[id]/select-string`, `/rentals/[id]/checkout`, `/rentals/success`, `/rentals/nice/fail`, `/mypage/rentals`, `/mypage/rentals/[id]/return-shipping` | `RentalSelectStringClient`, `RentalCheckoutClient`, 결과 페이지, `RentalsPageClient` | 라켓 상세 대여 CTA → 옵션 → checkout; 마이페이지 거래 링크 | 통과. **수정.** `/rentals/success`의 결과·접수번호·현재 상태·다음 행동·CTA 위계를 보완하고 CTA 역할/크기와 loading 표현을 동기화했다. NicePay·무통장 분기는 보존했다. |
| 교체 서비스 | `/services`, `/services/apply`, `/services/pricing`, `/services/locations`, `/services/tension-guide`, `/services/success`, `/services/applications/[id]/shipping`, `/mypage/applications/[id]` | 서비스 page/Apply Client, `StringingApplicationDetailClient` | 헤더 서비스 메뉴, 홈 교체 CTA, 마이페이지 상세/배송 링크 | 통과. **수정.** `/services/success`에서 결과·현재 상태·다음 단계·핵심 CTA를 상세보다 앞세우고 신청 내역 CTA를 `highlight`로 정정했다. 신청 상세 alias는 기존 flow panel로 이동한다. |
| 패키지·이용권 | `/services/packages`, `/services/packages/checkout`, `/services/packages/success`, `/services/packages/nice/fail`, `/packages`, `/packages/[id]`, `/mypage/packages` | packages Client, `PackageCheckoutClient`, 결과 페이지 | 헤더/홈 패키지 CTA, 패키지 카드, 마이페이지 탭 | 통과. **수정.** `/services/packages/success`의 결제/활성 상태와 다음 행동을 우선하고 중첩 `UnifiedPackageCard`를 성공 전용 `dl` 요약으로 교체했다. `/packages*` redirect는 보존했다. |
| 아카데미 | `/academy`, `/academy/apply`, `/academy/apply/success`, `/mypage/academy-applications/[id]` | academy page/apply page, `AcademyApplicationDetailClient` | 헤더·홈 아카데미 CTA, 클래스 카드, 마이페이지 상세 링크 | 통과. 목록·클래스 선택·신청·완료·상세/loading을 확인했다. |
| 장바구니·위시리스트 | `/cart`, `/mypage?tab=wishlist` | `CartPageClient`, `MypageClient`/Wishlist tab | 헤더 장바구니, 상품 카드, 마이페이지 탭 | 통과. PR #2325 결과를 재확인했으며 객관적 잔여 불일치가 없어 재수정하지 않았다. |
| 일반 주문·결제 | `/checkout`, `/checkout/success`, `/checkout/nice/fail`, `/rackets/nice/fail` | checkout Client, `CheckoutSuccessClient`, NicePay failure pages | 장바구니/상품·라켓 구매 CTA | 통과. NicePay와 무통장입금 로직은 감사만 하고 수정하지 않았다. |
| 마이페이지 | `/mypage?tab=dashboard|orders|rentals|applications|packages|wishlist|reviews|points`, `/mypage/profile`, `/mypage/racket-care`, `/mypage/orders/[id]` | `MypageClient`, 각 tabs, Profile/RacketCare Client, `OrderDetailClient` | 헤더 계정 메뉴와 모바일 마이 메뉴, 거래 카드 상세보기 | 통과. **수정.** 주문/대여의 반복 교체서비스 액션을 `highlight_soft`, 신청 빈 상태 CTA를 명시적 `highlight`, 아카데미 문의를 `outline`으로 정정했다. 데이터/URL 분기는 보존했다. |
| 리뷰 | `/reviews`, `/reviews/write` 및 query 기반 수정 | `ReviewsClient`, review write page, `ReviewCard`/dialogs | 헤더 커뮤니티, 홈 리뷰 CTA, 상품·거래의 후기 CTA | 통과. **수정.** 주문·대여·서비스 후기 작성 CTA를 선택 활동에 맞는 `secondary`로 변경하고 모바일 44px 터치 영역을 보완했다. |
| 커뮤니티 | `/board`, `/board/hot`, `/board/free`, `/board/free/write`, `/board/free/[id]`, `/board/free/[id]/edit`, `/board/market`와 write/detail/edit, `/board/gear`와 write/detail/edit | `BoardListClient`, `BoardDetailClient`, 각 Write/Edit Client | 헤더 데스크톱/모바일 커뮤니티 메뉴 | 통과. 자유게시판·중고거래·장비 사용기의 목록/작성/상세/수정을 확인했다. |
| 공지·이벤트 | `/board/notice`, `/board/notice/[id]`, `/board/event`, `/board/event/[id]` | Notice/Event list/detail Client | 푸터, 헤더 고객지원, 홈 공지 링크 | 통과. write 경로는 권한 제어되는 운영자 기능이므로 사용자 디자인 변경을 만들지 않았다. |
| 고객센터·문의 | `/support`, `/board/qna`, `/board/qna/write`, `/board/qna/[id]`, `/messages`, `/messages/write`, `/notifications` | `SupportFaqSearch`, `QnaPageClient`, Messages Client | 헤더 고객지원, 푸터 문의, 알림/메시지 진입 | 통과. FAQ 검색·빈 결과·문의 작성/상세·알림 상태를 확인했다. |
| 인증·계정 | `/login`, `/forgot-password`, `/reset-password`, `/account/password/change`, `/mypage/profile`, `/withdrawal` | `LoginPageClient`, 각 auth form Client | 헤더 로그인/계정 메뉴, 인증 필요 redirect | 통과. 현재 활성 로그인·비밀번호 찾기/재설정·계정 변경/탈퇴를 확인했다. 회원가입은 로그인 Client 내부 활성 모드다. |
| 정책 | `/terms`, `/privacy`, `/refund-policy` | 각 `page.tsx` | 푸터 정책 링크, checkout 안내 | 통과. 읽기 화면의 위계와 모바일 폭을 확인했다. |
| 전역 상태 | 전역 `loading.tsx`, `error.tsx`, `not-found.tsx` 및 위 경로군별 loading/error | `AppLoading`, `ResultState`, `components/system/NotFound` | 라우팅·fetch 실패/404 시 자동 진입 | 통과. 공용 semantic 상태, 반응형 action, skeleton을 사용한다. |
| 메인 슬라이드·푸터 | 모든 페이지 공통 | `components/HeroSlider.tsx`, `components/footer.tsx` | 메인 배너와 전역 layout | **수정.** 모바일 슬라이드 이전/다음과 compact footer 링크의 40px/36px 터치 영역을 44px로 보완했다. |

## 3. 제외 및 저우선순위

- **제외:** `app/admin/**`, `app/api/**`는 관리자/서버 경로다. `app/concept/**`와 `/auth` 개발 비밀번호 gate는 프로토타입·개발 도구 성격이므로 사용자 운영 화면에서 제외했다.
- **제외:** `/checkout/toss/**`, `/rackets/toss/**`, `/services/packages/toss/**`는 현재 비노출 Toss 전용 결과 화면이다. 운영 수단인 NicePay와 무통장입금 화면만 통과 여부를 확인했다.
- **저우선순위:** `/order-lookup/**`는 `NEXT_PUBLIC_GUEST_ORDER_MODE=on`일 때만 푸터에 나타나는 비회원 주문 경로다. 기본값 `legacy`에서는 숨겨져 있어 코드 변경 없이 기록만 남겼다.
- **별도 성격:** `/private-payments/**`는 개별 결제 링크를 받은 사용자만 접근하는 제한형 결제 화면이다. NicePay 결과 및 공용 결제 UI 적용 여부를 확인했고 기능/결제 로직은 보존했다.
- **redirect:** `/orders`, `/packages`, `/packages/[id]`, `/mypage/applications/[id]`처럼 redirect만 수행하는 alias는 목적지 화면을 감사하고 alias 자체 UI는 수정하지 않았다.

## 4. 발견 문제와 수정 파일

1. `components/HeroSlider.tsx`: 모바일 배너 이동 버튼이 `h-10 w-10`(40px)이어서 44px 터치 기준보다 작았다. 모바일은 `h-11 w-11`, 포인터 중심의 `bp-md` 이상은 기존 40px을 유지했다. 링크, Embla handler, aria-label은 변경하지 않았다.
2. `components/footer.tsx`: compact footer의 정책·문의·조건부 주문조회 링크가 `min-h-9`(36px)이었다. 네 링크만 `min-h-11`로 높이고 href 및 guest mode 조건은 그대로 보존했다.

그 밖의 raw 검정/흰색 검색 결과는 활성 사용자 TSX에서 발견되지 않았다. `font-bold`/`font-semibold`, radius, 직접 작성 button 결과는 제목 위계, 상태/가격, 이미지·필터·별점·캐러셀 제어처럼 의미가 있는 사용이거나 이미 semantic token/focus-visible/반응형 규칙을 갖춘 경우여서 억지 치환하지 않았다.

## 5. 수정하지 않은 이유와 최종 잔여 위험

- 최근 개선된 cart, checkout, success/failure 화면은 공용 checkout/public primitives와 semantic token을 사용하고 있어 재설계하지 않았다.
- 직접 작성된 `<button>`은 이미지 삭제/정렬, 별점, 필터 chip, carousel 등 Button CTA가 아닌 정밀 제어가 다수다. 공용 Button으로 일괄 변환하면 크기와 이벤트 동작이 달라질 위험이 있어 실제 위반 두 곳만 수정했다.
- 정적 감사이므로 런타임 API 데이터가 만드는 극단적으로 긴 상품명·주소와 실제 기기 safe-area 조합은 잔여 위험이다. 요청 범위상 dev server, 브라우저, 테스트, build/lint는 실행하지 않는다.
- 비회원 모드를 장래 `on`으로 전환하거나 Toss를 다시 노출할 때에는 해당 저우선순위/제외 화면을 별도 운영 전 감사해야 한다.


## 6. PR #2326 감사 누락 정정

PR #2326 문서는 위 성공 화면과 라켓 구매 checkout을 통과로 기록했으나, 실제 코드에는 기본 검정 `Button`, 개별 `h-12`, 표준 breakpoint, 과도한 `font-semibold`, 성공 상세의 카드 중첩이 남아 있었다. 정적 판정이 실제 CTA 역할과 렌더 구조를 충분히 대조하지 못한 감사 누락이며, 이번 보완은 해당 원인의 구체적 잔여만 수정했다. PR #2326에서 완료한 `HeroSlider`와 모바일 푸터 링크의 44px 변경은 되돌리지 않았다.

### 이번 정정의 코드 변경

- `/rentals/success`: 결과 다음에 접수/상태와 지금 할 일, 다음 단계 및 핵심 CTA가 인지되도록 역할을 정리했다. 내역 확인은 `highlight`, 반복 가능한 교체서비스 확인은 `highlight_soft`, 고객센터/보조 이동은 `outline`이다. handoff 자동 이동과 URL 분기는 유지했다.
- `/services/success`: 신청 내역 확인 및 상태 흐름 CTA를 `highlight`, 홈/문의 이동을 `outline`으로 명시하고 성공 전용 typography와 breakpoint를 V2 토큰으로 정리했다. `RacketCareSuccessFeedback`의 저장소 및 이동 동작은 변경하지 않았다.
- `/services/packages/success`: 사용 가능 시 교체서비스 시작을 `highlight`, 패키지권 확인을 주·후속 문맥에 따라 `highlight`/`highlight_soft`, 다른 패키지 보기를 `outline`로 정리했다. 상품 카드 중첩은 패키지명·횟수·유효기간·결제금액·활성 상태 `dl`로 평면화했다.
- `/rackets/[id]/purchase`: Toss 파일/분기를 건드리지 않고 NicePay와 무통장 CTA만 `highlight`, `tall`, `responsive`, 전체 폭으로 통일했다.
- 후기 및 반복 액션: 후기 작성은 `secondary`; 마이페이지 교체서비스는 `highlight_soft`; 신청 빈 상태는 `highlight`; 아카데미 문의는 `outline`; 강제 비밀번호 변경 제출은 로그인 제출과 같은 `highlight`로 정정했다.

### 남겨둔 default/implicit Button과 구체적 이유

정적 검색 결과 중 다음 버튼은 의도적으로 유지한다.

- `app/mypage/academy-applications/[id]/_components/AcademyApplicationDetailClient.tsx`의 “새로고침” 및 상태 변경 폼 버튼: 조회 오류 복구 또는 기존 일반 폼 제출이며 결제·확정 CTA 역할 정정 대상이 아니다. destructive 삭제 동작도 범위에서 제외했다.
- `app/mypage/applications/_components/ApplicationsClient.tsx`의 “더 보기” 및 상태별 폼/대화상자 버튼: 목록 pagination, 일반 폼 제출, destructive 동작으로서 이번 성공/반복 CTA 원인과 다르다.
- `app/mypage/tabs/OrderList.tsx`, `RentalsList.tsx`의 상세 보기·취소/확정 관련 버튼: 상세 이동은 이미 outline이고, 구매확정 등 기존 primary가 정책상 명확한 거래 명령 또는 destructive 동작이다. 교체서비스 반복 CTA만 `highlight_soft`로 정정했다.
- 성공 화면의 개발 전용 `DevMarkPaidButton`: 관리자/개발 노출 스위치 전용이므로 사용자 CTA 감사 대상에서 제외했다.
- Toss 전용 컴포넌트의 implicit/default Button: 이번 운영 결제수단이 아니며 사용자가 명시한 변경 금지 범위라 유지했다.

variant가 생략된 검색 결과 중 아이콘·캐러셀·필터 chip, destructive 동작, 일반 폼 제출은 공용 Button의 기본 primary 의미 또는 compact 제어 크기를 의도적으로 사용한다. 비회원 `order-lookup`, 관리자/API/concept, 실제 사용자 페이지에서 import되지 않는 관리자용 feature 컴포넌트도 이번 활성 사용자 범위에서 제외했다.

## 7. 데스크톱 공개 화면 시각 QA 잔여 보정

후속 데스크톱 공개 화면 시각 QA에서 통과로 기록했던 `/rackets/compare`, `/academy`, 전역 상태 화면과 `/board` 최신 리뷰 영역에 잔여 문제가 확인됐다. `components/system/NotFound.tsx`, `components/system/AccessDenied.tsx`, `app/rackets/compare/_components/RacketCompareClient.tsx`의 대표 복구·다음 행동 CTA를 명시적 `highlight`와 44px 높이로 정리하고, `app/board/page.tsx`의 선택적 후기 작성은 `secondary`로 구분했다. `app/academy/page.tsx`는 공개 클래스 개수에 따라 1개는 중앙 단일 열, 2개는 중앙 2열, 3개 이상은 반응형 2열/3열이 되도록 보정했다.

이번 기록은 데스크톱에서 접근 가능한 공개 상태를 직접 확인한 범위이며, 인증 데이터가 필요한 성공·상세 화면이나 실제 모바일 기기 QA 완료를 뜻하지 않는다. 선택된 필터·탭의 검은 active 상태, 역상 Hero, destructive 동작은 과거 default CTA 잔여와 역할이 달라 변경 대상으로 보지 않았다.
