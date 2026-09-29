# TennisFlowShop 타이포그래피·ClearType 전수 감사

- 감사 기준 저장소: `SeopE9611/SideProject`
- 기준 브랜치: `main`
- 확인한 최신 main: `9350f0cb3cd5a6c6cf760cceed4bd9b5a8a6f57c` (PR #2206 병합)
- 타이포그래피 관련 최신 변경: PR #2205, merge `02c0ac84b0d0f502bcb2d6241634fc98ddfd47b8`
- 분석 범위: `TennisFlowShop/app`, `TennisFlowShop/components`, 전역 CSS, Tailwind 토큰, 로드 폰트 파일
- 분석 방식: 현재 GitHub main 확인 + 첨부 압축본 전체 정적 검색 + PR #2205 패치 반영

## 1. 결론

PR #2205는 올바른 2개 핫픽스를 포함하지만 전수 정리는 아니다.

1. 헤더 스태킹 수정(`relative z-10`)은 적절하다.
2. 홈의 `교체 신청 미리보기`를 Spoqa UI 폰트와 정상 자간으로 바꾼 것도 적절하다.
3. 그러나 동일·유사 위험 패턴이 다른 공개 화면에 대량으로 남아 있다.
4. 글씨가 뭉쳐 보이는 원인은 하나가 아니라 다음 네 계층으로 나뉜다.

| 계층 | 판정 | 영향 |
| --- | --- | --- |
| 작은 Gmarket + 음수 소수 자간 | 확정적인 코드 위험 | Windows Chrome 100%에서 RGB fringe와 획 뭉침 증폭 |
| 지원하지 않는 `font-semibold(600)` | 전역 토큰 불일치 | Spoqa/Gmarket이 600 대신 700 face를 선택하여 예상보다 굵게 표시 |
| 낮은 알파 텍스트 | 별도 가독성 위험 | 낮은 대비가 흐림으로 인식될 수 있음 |
| backdrop/일시적 transform | 국소 시각 검증 대상 | 합성 레이어에서 grayscale AA 또는 일시적 흐림 가능 |

폰트 파일 손상이나 힌팅 제거가 주원인이라는 증거는 없다. 세 개 Gmarket WOFF2 모두 TrueType outline이고 `fonthashint: True`로 확인된다.

## 2. 로드 폰트와 실제 weight

### GmarketSans

전역 `@font-face`가 제공하는 weight:

- 300 Light
- 500 Medium
- 700 Bold

400과 600은 제공하지 않는다.

### Spoqa Han Sans Neo 3.3.0

패키지 CSS가 제공하는 weight:

- 100 Thin
- 300 Light
- 400 Regular
- 500 Medium
- 700 Bold

600은 제공하지 않는다.

### 문제

Tailwind 기본 `font-semibold`는 600이다. 그러나 두 폰트 모두 600 face가 없다. CSS font matching에 따라 600 요청은 대체로 700 face로 매칭된다. 따라서 작성자가 semibold 정도를 기대한 텍스트가 실제로는 bold로 표시된다.

정적 집계:

| 항목 | 횟수 | 파일 수 |
| --- | ---: | ---: |
| 전체 `font-semibold` | 1,097 | 208 |
| 공개 UI `font-semibold` | 885 | 171 |
| 관리자 UI `font-semibold` | 212 | 37 |

공개 UI의 주요 분포:

| 경로 | 횟수 |
| --- | ---: |
| `app/services` | 186 |
| `app/mypage` | 106 |
| `app/features` | 90 |
| `app/board` | 90 |
| `app/checkout` | 71 |
| `app/rackets` | 62 |
| `app/rentals` | 58 |
| `app/order-lookup` | 36 |
| `app/cart` | 28 |
| `app/products` | 26 |

크기가 명시된 `font-semibold` 중 주요 분포:

| 토큰 | px | 확인 횟수 |
| --- | ---: | ---: |
| `text-ui-body-sm` | 14 | 146 |
| `text-ui-card-title-lg` | 17 | 98 |
| `text-ui-body` | 15 | 56 |
| `text-ui-section-title` | 20 | 55 |
| `text-ui-label` | 13 | 47 |
| `text-ui-page-title-lg` | 30 | 34 |
| `text-ui-body-lg` | 16 | 26 |
| `text-ui-page-title` | 24 | 25 |
| `text-ui-card-title` | 16 | 16 |

이 문제는 ClearType의 RGB fringe 자체를 만드는 것은 아니지만, 13~20px에서 실제 700 획을 사용하게 해 획 사이 공간을 줄이고 뭉침 인식을 악화시킨다.

## 3. 브랜드 폰트 전수 집계

PR #2205 반영 후 공개 TSX 기준:

| 패턴 | 규모 |
| --- | ---: |
| 브랜드 폰트/`marketingTitle` 참조 | 90개, 48개 파일 |
| `font-brand-heading` | 71개 |
| `font-brand-display` | 7개 |
| `font-brand-bold` | 3개 |
| 남은 `styles.marketingTitle` | 9개 |
| 공개 음수 arbitrary tracking | 31개, 19개 파일 |

관리자 UI에는 Gmarket 브랜드 클래스와 음수 arbitrary tracking이 발견되지 않았다. 관리자 쪽 주요 문제는 212개의 `font-semibold`이다.

## 4. 전역 클래스 설계 문제

`app/globals.css`의 현재 정의:

```css
.font-brand-heading {
  font-family: "GmarketSans", ...;
  font-weight: 700;
  letter-spacing: -0.015em;
  font-synthesis: none;
}
```

이 클래스가 16px부터 대형 히어로까지 함께 쓰인다.

| 크기 | 실제 추가 자간 |
| ---: | ---: |
| 16px | -0.24px |
| 17px | -0.255px |
| 20px | -0.30px |
| 24px | -0.36px |
| 30px | -0.45px |

`@tailwind utilities`보다 `.font-brand-heading`이 뒤에서 선언되므로 동일 specificity의 `tracking-normal`을 JSX에 추가해도 전역 클래스의 `-0.015em`이 이길 수 있다. 실제 브라우저 computed style 확인이 필요하지만, CSS cascade 기준으로는 기존 `font-brand-heading tracking-normal` 조합이 안전한 초기화가 아니다.

### 권장 구조

`font-brand-heading`에서는 `letter-spacing`을 제거하고 폰트 family/weight만 담당하게 한다. 음수 자간은 30px 이상의 명시적인 브랜드 디스플레이에 별도 utility로 적용한다.

예:

```css
.font-brand-heading {
  font-family: "GmarketSans", ...;
  font-weight: 700;
  font-synthesis: none;
}
```

대형 표현만 JSX에서 명시적으로 `tracking-[-0.015em]` 등을 사용한다. 작은 UI 제목은 Spoqa와 `tracking-normal`을 사용한다.

## 5. P1: 16~20px Gmarket 사용처

명시적 사용만 51개, 28개 파일이다. 공유 컴포넌트 재사용까지 계산하면 실제 렌더링 표면은 더 많다.

### 메시지·아카데미

- `app/messages/MessagesClient.tsx`
- `app/academy/apply/_components/AcademyApplyClient.tsx`
- `app/academy/apply/page.tsx`

### 게시판

- `app/board/free/_components/FreeBoardWriteClient.tsx`
- `app/board/free/[id]/edit/_components/FreeBoardEditClient.tsx`
- `app/board/gear/_components/FreeBoardWriteClient.tsx`
- `app/board/notice/_components/NoticeDetailClient.tsx`
- `app/board/notice/_components/NoticeListClient.tsx`
- `app/board/notice/_components/NoticeWriteClient.tsx`
- `app/board/qna/_components/QnaPageClient.tsx`
- `app/board/qna/_components/QnaListLoadingShell.tsx`
- `app/board/qna/[id]/page.tsx`
- `app/board/qna/write/page.tsx`

### 마이페이지

- `app/mypage/profile/_components/ProfileClient.tsx`
- `app/mypage/profile/_components/TennisProfileForm.tsx`
- `app/mypage/tabs/AcademyApplicationsTab.tsx`
- `app/mypage/tabs/MyPointsTab.tsx`
- `app/mypage/tabs/PassList.tsx`
- `app/mypage/tabs/QnAList.tsx`
- `app/mypage/tabs/ReviewList.tsx`
- `app/mypage/tabs/Wishlist.tsx`

### 리뷰·서비스·라켓케어

- `app/reviews/write/page.tsx`
- `app/services/pricing/page.tsx`
- `app/racket-care/_components/RacketCareFinalCta.tsx`
- `app/racket-care/_components/RacketCareMethodsSection.tsx`
- `components/reviews/ReviewHubHero.tsx`
- `components/racket-care/RacketCareFlowSection.tsx`
- `components/racket-care/RacketCareValueSection.tsx`

### 대표적인 확정 교체 후보

| 위치 | 현재 | 판정 |
| --- | --- | --- |
| 아카데미 신청 카드 제목 | Gmarket 700, 16px, -0.015em | Spoqa UI 제목으로 교체 |
| Q&A 작성 안내 카드 | Gmarket 700, 16px, -0.015em | Spoqa UI 제목으로 교체 |
| Q&A 구매상품/전체상품 제목 | Gmarket 700, 16px, -0.015em | Spoqa UI 제목으로 교체 |
| 위시리스트 상품명 | Gmarket 700, 16px, -0.015em | Spoqa 상품 카드 제목으로 교체 |
| 마이페이지 프로필 CardTitle | Gmarket 700, 20px, -0.015em | Spoqa UI 제목으로 교체 |
| 공지 작성 섹션 제목 | Gmarket 700, 17~20px, -0.015em | Spoqa UI 제목으로 교체 |

## 6. 공유 컴포넌트로 증폭되는 P1 사용처

단일 class 정의가 여러 화면을 만든다.

### `components/public/SectionHeader.tsx`

- `variant="brand"`는 모바일 20px, 데스크톱 24px에 Gmarket 700과 음수 자간을 적용한다.
- 실제 `SectionHeader variant="brand"` 호출: 11개
- 관련 화면: 아카데미, 공지 목록/로딩, Q&A 작성/로딩

일반 UI 섹션 제목이면 기본 `font-ui-bold tracking-normal`을 사용하고, 정말 브랜드 표현일 때만 별도의 큰 브랜드 variant를 사용해야 한다.

### `app/mypage/_components/MypageDetailCard.tsx`

- feature variant의 CardTitle은 16px에 `font-brand-heading`을 덮어쓴다.
- 실제 feature 호출: 19개
- 관련 화면: 아카데미 신청 상세, 주문 상세, 대여 상세 및 스켈레톤

feature는 색상/표면 강조이지 브랜드 폰트를 의미하지 않으므로 Spoqa UI 제목이 적절하다.

### `StringingApplicationDetailClient.tsx`

- 공개 사용자 상세 카드에 `detailCardTitleClass = font-brand-heading ...`를 적용한다.
- 실제 참조 지점: 6개
- CardTitle 기본 크기는 17px이다.

모두 Spoqa UI CardTitle로 되돌리는 것이 적절하다.

### `ApplyHero.tsx`

- PublicPageHero의 24/30px 제목을 Gmarket으로 덮어쓴다.
- 24px 구간은 P2 시각 검토, 30px은 브랜드 페이지 제목으로 유지 가능하다.

## 7. 홈 페이지 남은 `marketingTitle`

PR #2205가 한 곳을 제거했지만 9개 사용이 남아 있다.

| 용도 | 기본 크기 | 판정 |
| --- | ---: | --- |
| 신청 경로 카드 제목 | 20px | P1, #2205와 동일 조합이므로 교체 필요 |
| 신청 경로 상세 제목 | 24px | P2, UI 역할이면 Spoqa 권장 |
| 진행 단계 제목 | 24px | P2 |
| 신뢰 섹션 제목 | 24px | P2 |
| 추천 패널 제목 | 24px | P2 |
| 패키지 안내 제목 | 24px | P2 |
| 라켓 쇼케이스 제목 | CSS 대형 제목 | 브랜드 유지 가능 |
| 빈 라켓 상태 제목 | 24px | P2, 상태 UI이므로 Spoqa 권장 |
| 라켓케어 안내 제목 | 24px | P2 |

`marketingTitle` 하나가 20~대형 제목을 모두 담당하므로, `font-family`/weight와 display tracking을 분리해야 한다.

## 8. P2: 24px Gmarket 사용처

명시적 참조 약 20개이며 일부는 P1 반응형 클래스와 겹친다. 관련 파일:

- `app/login/_components/RegisterTabPanel.tsx`
- `app/board/free/_components/FreeBoardWriteClient.tsx`
- `app/board/free/[id]/edit/_components/FreeBoardEditClient.tsx`
- `app/board/gear/_components/FreeBoardWriteClient.tsx`
- `app/board/gear/[id]/edit/_components/FreeBoardEditClient.tsx`
- `app/board/market/_components/FreeBoardWriteClient.tsx`
- `app/board/market/[id]/edit/_components/FreeBoardEditClient.tsx`
- `app/board/notice/_components/NoticeDetailClient.tsx`
- `app/board/qna/_components/QnaPageClient.tsx`
- `app/board/qna/_components/QnaListLoadingShell.tsx`
- `app/board/qna/[id]/page.tsx`
- `app/private-payments/[id]/PrivatePaymentClient.tsx`
- `app/services/page.tsx`
- `app/services/pricing/page.tsx`
- `app/services/tension-guide/page.tsx`
- `app/services/locations/page.tsx`
- `app/mypage/tabs/MyPointsTab.tsx`

판정 원칙:

- 폼/카드/상태/결제 제목이면 Spoqa로 교체한다.
- 페이지 대표 브랜드 제목이며 30px 이상으로 커지는 경우 Gmarket을 유지할 수 있다.
- 모바일 기본 24px만 Gmarket이고 데스크톱 30px인 경우 모바일 시각 검증 후 역할을 분리한다.

## 9. 작은 음수 자간

공개 arbitrary negative tracking은 31개, 19개 파일이다. 작은 크기에서 직접 확인된 고위험 참조는 23개다.

관련 파일:

- `app/academy/apply/_components/AcademyApplyClient.tsx`
- `app/academy/apply/page.tsx`
- `app/board/notice/_components/NoticeDetailClient.tsx`
- `app/board/qna/write/page.tsx`
- `app/features/stringing-applications/components/StringingApplicationDetailClient.tsx`
- `app/mypage/_components/MypageDashboardHero.tsx`
- `app/mypage/_components/MypageDetailCard.tsx`
- `app/mypage/racket-care/_components/RacketCareClient.tsx`
- `app/mypage/racket-care/_components/RacketCareHero.tsx`
- `app/mypage/racket-care/_components/RacketCareStatusCard.tsx`
- `app/racket-care/_components/RacketCareLandingHero.tsx`
- `app/racket-care/_components/RacketCareMethodsSection.tsx`
- `app/services/page.tsx`
- `app/services/pricing/page.tsx`
- `app/services/tension-guide/page.tsx`
- `app/services/locations/page.tsx`
- `components/public/SectionHeader.tsx`
- `components/racket-care/RacketCareFlowSection.tsx`
- `components/reviews/ReviewHubHero.tsx`

16~20px의 `tracking-[-0.01em]`과 `tracking-[-0.015em]`은 제거 후보이다. 숫자·짧은 라벨도 100% 배율에서 물리 픽셀 경계가 달라질 수 있으므로 `tracking-normal`을 기본으로 한다.

## 10. 낮은 대비 텍스트

색상 alpha가 있는 텍스트 참조:

| 영역 | 횟수 |
| --- | ---: |
| 공개 UI | 277 |
| 관리자 UI | 95 |

주요 분포는 `app/features` 110, `app/board` 81, `app/checkout` 19, `app/rentals` 15, `app/mypage` 14이다.

`text-foreground/70~80`, `text-muted-foreground/50~70`, 요소 `opacity-60~90`은 ClearType의 직접 원인은 아니지만 얇은 13~14px 텍스트에서 흐림으로 인식될 수 있다. 전체를 일괄 100%로 바꾸면 정보 위계가 무너지므로 다음 조건만 우선 교정한다.

- 13~14px 본문인데 alpha 75 이하
- 주요 값/상태/버튼 레이블인데 alpha 적용
- 다크 모드에서 WCAG 대비가 부족한 경우
- 비활성 상태가 아닌데 `opacity`를 사용한 경우

## 11. 합성 레이어·필터 검토

### 영구 scale/zoom

공개 UI에서 발견된 scale은 대부분 이미지, 아이콘, 별점 hover이다. 일반 페이지 텍스트 전체를 영구 scale하는 패턴은 발견되지 않았다. 따라서 현재 남은 전역 뭉개짐의 주원인을 transform으로 볼 근거는 없다.

### 애니메이션 transform

Select, Dialog, Popover, Tooltip의 `zoom-in-95/zoom-out-95`와 필터 패널 motion이 있다. 열림/닫힘 애니메이션 중 텍스트가 잠시 흐려질 수 있지만 안정 상태의 전역 문제는 아니다.

### backdrop blur

공개 UI 참조: 19개 파일. 주요 위치:

- 카탈로그 필터 footer
- 라켓 비교 tray/finder footer
- 마이페이지 라켓케어 모바일 내비게이션
- 상품 리뷰 마스킹/다이얼로그
- 추천 스트링 sticky card
- 체크아웃 로딩 overlay

backdrop-filter는 배경만 흐리지만 합성 레이어를 만들 수 있어 Windows Chrome에서 descendant 텍스트의 AA 방식이 달라질 수 있다. 이를 전부 제거할 근거는 없으며, 실제 흐림 신고가 있는 표면만 Windows Chrome DPR 1에서 비교해야 한다.

## 12. 유지 가능한 브랜드 사용

다음은 기본적으로 유지 가능하다.

- `font-brand-display` 7개: 대부분 44px 이상 숫자/히어로
- 홈 히어로 제목: 46px 이상
- 홈 섹션 제목: clamp 최소 32px
- 라켓 쇼케이스 대형 제목
- 데스크톱 헤더 wordmark 24~30px

단 모바일 헤더 wordmark 15px Gmarket은 브랜드 예외로 분류하고 100% 배율에서 별도 확인한다. 음수 자간은 없으므로 우선순위는 낮다.

## 13. 수정 우선순위

### Phase A — 전역 토큰 정합성

1. `.font-brand-heading`에서 `letter-spacing` 제거
2. 큰 브랜드 제목용 별도 tracking utility 도입
3. `font-semibold` 정책 확정
   - 권장: Tailwind `semibold`를 500으로 매핑하고 진짜 강한 강조만 `font-ui-bold`/`font-bold` 700 사용
   - 대안: 1,097개를 역할별로 500/700으로 개별 치환
4. 변경 전후 computed weight와 줄바꿈 영향 확인

### Phase B — 확정 P1 교체

1. 16~20px Gmarket 명시적 51개 사용처
2. SectionHeader brand 11개 호출
3. MypageDetailCard feature 19개 호출
4. Stringing detail CardTitle 6개
5. 홈 신청 경로 20px marketingTitle

일반 UI 제목은 Spoqa `font-ui-medium` 또는 `font-ui-bold`와 `tracking-normal`로 교체한다.

### Phase C — P2 및 시각 검증

1. 24px Gmarket 약 20개
2. 작은 arbitrary negative tracking 23개
3. alpha text의 대비 취약 표본
4. backdrop-blur 표면

### Phase D — 회귀 방지

정밀한 정책 검사 추가:

- `font-brand-heading` + `text-ui-body*`/`text-ui-card-title*` 금지
- 20px 이하 요소의 negative arbitrary tracking 금지
- 지원하지 않는 weight 600 사용 금지 또는 semibold=500 명시
- 예외는 파일/사유가 있는 allowlist만 허용

## 14. 검증 매트릭스

자동 검사:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- 타이포그래피 정책 검사

수동 검사:

- Windows Chrome, 하드웨어 가속 ON/OFF 각 1회
- 디스플레이 DPR 1 우선
- 브라우저 배율 80%, 100%, 120%, 125%
- 라이트/다크
- 로그인 전/후
- 홈, 서비스, 게시판, Q&A 작성, 마이페이지, 라켓케어, 체크아웃
- 동일 viewport와 동일 콘텐츠의 수정 전후 캡처

픽셀에 RGB 성분이 전혀 없는 것을 목표로 하지 않는다. Windows ClearType의 정상 subpixel AA는 남을 수 있다. 합격 기준은 100%에서 획이 겹쳐 보이거나 색 테두리가 과도하게 인식되지 않고, 120%와 비교해 체감 품질 차이가 크지 않은 것이다.

## 15. 최종 판정

- PR #2205: 올바른 핫픽스, 전수 완료 아님
- 폰트 파일: 손상 근거 없음
- 가장 큰 구조 문제 1: 작은 Gmarket에 내장된 음수 자간
- 가장 큰 구조 문제 2: 존재하지 않는 600 weight를 요청하는 `font-semibold` 1,097개
- 공개 UI P1: 16~20px Gmarket 명시적 51개 + 공유 컴포넌트 다수
- 공개 UI P2: 24px Gmarket 약 20개, 작은 음수 자간 23개
- 추가 시각 위험: alpha text 277개, backdrop blur 19개 표면

후속 PR은 한 문구씩 고치는 방식이 아니라 Phase A와 Phase B를 한 묶음으로 처리해야 한다. 그렇지 않으면 같은 문제가 계속 다른 페이지에서 발견된다.
