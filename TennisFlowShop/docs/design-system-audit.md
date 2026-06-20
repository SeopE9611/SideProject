# 디자인 시스템 기준 조사

## 1. 확인한 파일 목록

- `app/globals.css`
- `tailwind.config.ts`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/layout/SiteContainer.tsx`
- `components/public/PublicPageHero.tsx`
- `components/public/SectionHeader.tsx`
- `components/public/PublicSurface.tsx`
- `components/public/InteractiveCard.tsx`
- `lib/badge-style.ts`
- 주요 페이지/컴포넌트의 반복 className 패턴: `app/HomePageClient.tsx`, `app/products/page.tsx`, `app/rackets/page.tsx`, `app/services/page.tsx`, `app/services/apply/page.tsx`, `app/services/packages/_components/StringPackagesPageClient.tsx`, `app/mypage/**`, `app/checkout/page.tsx`, `app/products/[id]/ProductDetailClient.tsx`, `components/**`

## 2. 현재 디자인 시스템 상태 요약

### 색상 토큰

- 전역 CSS 변수는 `background`, `foreground`, `surface`, `card`, `popover`, `primary`, `accent`, `secondary`, `muted`, `border`, `input`, `ring`, `overlay`, `destructive`, `info`, `success`, `warning` 중심으로 정의되어 있다.
- Tailwind 색상 확장은 위 CSS 변수를 `hsl(var(--token))` 형태로 노출한다.
- 라이트/다크 모드 모두 Premium Monotone 톤으로 설계되어 있어, 신규 컴포넌트는 직접 hex 또는 임의 색상보다 `bg-card`, `bg-muted`, `text-muted-foreground`, `border-border`, `text-primary`, `bg-primary`를 우선 사용해야 한다.
- 상태 색상은 `info`, `success`, `warning`, `destructive` 계열로 충분히 정리되어 있으나 일부 레거시 alias와 직접 className 색상이 함께 남아 있다.

### Radius

- 전역 radius 변수는 `--radius: 0.5rem`이지만 Tailwind 확장은 `lg: 0.5rem`, `md: 0.375rem`, `sm: 0.25rem`만 별도 선언한다.
- 실제 UI에서는 `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-lg`, `rounded-md`, `rounded-full`이 혼재한다.
- 공용 카드 계열은 대체로 `rounded-2xl`, 버튼은 `rounded-xl`, 작은 내부 박스는 `rounded-xl` 또는 `rounded-lg`가 많이 쓰인다.

### Shadow / Border

- 공용 Card/PublicSurface/InteractiveCard는 `border border-border bg-card shadow-sm`를 기본 표면 기준으로 사용한다.
- 강조 표면은 `shadow-md`, 플로팅 위젯은 `shadow-xl`, 이미지 위 배지는 `shadow-md ring-1 ring-white/25`가 쓰인다.
- 일부 페이지와 스켈레톤에는 `shadow-md`, `shadow-lg`, `shadow-xl`, gradient가 직접 섞여 있어 공용 강도 기준을 분리할 필요가 있다.

### Spacing / Layout

- `SiteContainer`는 `px-3 → bp-sm:px-4 → bp-md:px-6`, 기본 최대폭 `1200px`, wide `1400px`를 제공한다.
- Tailwind container도 `0.75rem/1rem/1.5rem/2rem` padding과 `2xl: 1400px` 기준을 갖고 있다.
- 공용 PublicPageHero는 `py-10 bp-sm:py-14`, SectionHeader는 `gap-3`, PublicSurface는 `p-4`, `p-5 sm:p-6`, `p-6 sm:p-8` padding scale을 제공한다.

## 3. 이미 잘 잡혀 있는 부분

- 색상 토큰은 CSS 변수와 Tailwind 확장이 연결되어 있어 다크 모드 대응 기반이 좋다.
- `Button`, `Card`, `Badge`가 cva 기반 variant 구조를 갖고 있어 점진적 통일이 가능하다.
- `SiteContainer`, `PublicPageHero`, `SectionHeader`, `PublicSurface`, `InteractiveCard`가 public 페이지에서 이미 쓰이고 있어, public 화면부터 디자인 기준을 고정하기 좋다.
- `lib/badge-style.ts`는 주문/결제/배송/대여/신청/QnA/리뷰/공지 등 상태별 tone 매핑을 제공해 StatusBadge 통합의 중심으로 삼기 좋다.
- `Badge` 컴포넌트가 semantic variant와 legacy alias를 동시에 제공하므로, 대규모 치환 없이 신규 사용처부터 semantic 이름으로 이관할 수 있다.

## 4. 일관성이 깨지는 부분

- Button variant 사용량이 `outline`에 크게 몰려 있고, `secondary`와 의미가 겹친다. 현재 기준으로 `outline`은 보조 액션/취소/뒤로가기/상세 보기까지 넓게 쓰이며, `secondary`도 비슷한 용도로 쓰인다.
- `Card`의 `elevatedGradient`, `CardHeader`의 `sectionGradient`는 실제 gradient가 아니라 `shadow-md`, `bg-secondary/70` alias로 남아 있어 명칭과 시각 결과가 어긋난다.
- 같은 카드 의미라도 `Card`, `PublicSurface`, `InteractiveCard`, 직접 `div className="rounded-2xl border border-border bg-card shadow-sm"`가 섞인다.
- 섹션 제목은 `SectionHeader` 사용처가 늘고 있으나, 주요 페이지 일부는 직접 `h2`, `p`, actions 레이아웃을 반복한다.
- 배지 계열은 `Badge` variant, `StatusBadge`, `badge-style.ts` className 반환값, 페이지 직접 색상 className이 공존한다.
- `/mypage`, `/checkout`, `/products/[id]` 계열은 기능 밀도가 높아 직접 정의된 요약 박스/CTA/상태 안내 박스가 많고, 후속 개선 시 가장 먼저 공용화 기준을 적용해야 한다.
- 플로팅/팝업/히어로 일부에서 `shadow-xl`, `shadow-lg`, 강한 gradient, `bg-primary/10`, `bg-warning/10` 등이 직접 쓰여 화면별 강조 강도가 달라질 수 있다.

## 5. 반복되는 UI 패턴 목록

- 페이지 shell: `min-h-screen`, `bg-background`, `SiteContainer`, `py-*`, `space-y-*` 조합.
- 히어로: eyebrow/title/description/actions 구조. PublicPageHero 사용처와 직접 구현 히어로가 혼재한다.
- 섹션 헤더: eyebrow/title/description/actions 구조. SectionHeader로 통일 가능하다.
- 표면 카드: `rounded-2xl border border-border bg-card p-* shadow-sm`.
- 내부 요약 박스: `rounded-xl border border-border bg-muted/20|bg-muted/30 p-*`.
- 인터랙션 카드: `hover:-translate-y-0.5`, `hover:shadow-md`, `hover:border-primary/30`.
- CTA 그룹: `flex flex-col gap-2 bp-sm:flex-row`, 모바일 full-width 버튼, 데스크톱 auto-width 버튼.
- 상태/메타 배지: 주문/결제/배송/신청/QnA/리뷰/공지 카테고리 배지.
- Empty/Loading/Skeleton: `Card` + muted skeleton block + center text/button 구조.
- Price/Summary 패널: checkout/mypage/product detail에서 가격, 포인트, 배송비, 총합을 카드 내부 row로 반복.

## 6. 앞으로 통일해야 할 컴포넌트 후보

1. `PageShell`
   - `SiteContainer`, 페이지 padding, `space-y-*`, 배경 기준 통합.
2. `PageHero`
   - public/admin/mypage의 eyebrow/title/description/actions 구조를 PublicPageHero 기반으로 일반화.
3. `SectionHeader`
   - 이미 존재하는 컴포넌트를 표준 섹션 제목으로 확정하고 직접 h2 패턴을 점진 치환.
4. `SurfaceCard`
   - `Card`와 `PublicSurface` 역할을 정리해 일반 정보 카드/패널 기준 제공.
5. `ActionCard`
   - 클릭 가능한 카드 기준. `InteractiveCard`를 기반으로 href/div 양쪽 지원 유지.
6. `SummaryCard`
   - mypage/checkout/product detail의 요약 박스, 금액/상태/핵심 정보 표시용.
7. `EmptyState`
   - 빈 목록/로그인 필요/권한 없음/검색 결과 없음의 아이콘, 제목, 설명, CTA 구조 통합.
8. `StepIndicator`
   - `/services/apply`, checkout, 신청/주문 진행 단계의 step UI 통합.
9. `PriceSummary`
   - 상품 상세, 장바구니, checkout, 패키지 결제의 가격 row와 총합 강조 기준 통합.
10. `StatusBadge`
    - `Badge` + `badge-style.ts` tone/spec를 단일 진입점으로 연결.
11. `PrimaryCTAGroup`
    - 주요 CTA 1개 + 보조 CTA 1~2개, 모바일 full-width, 데스크톱 inline 기준.

## 7. 실제 수정한 파일이 있다면 수정 내용

- 이번 작업에서는 기능 로직, API, DB, 결제, 주문 상태, 재고 계산, 포인트 계산, 패키지 적용 로직을 수정하지 않았다.
- 조사 결과를 문서화하기 위해 `docs/design-system-audit.md`만 신규 추가했다.

## 8. 수정하지 않고 다음 단계로 넘기는 것이 좋은 항목

- `Button` variant 명칭/동작 변경: 사용처가 많아 이번 단계에서 변경하면 회귀 위험이 크다.
- `Card`/`PublicSurface` 통합 리팩터링: 페이지 구조 변경 없이 기준만 먼저 확정한 뒤 화면 단위로 적용하는 것이 안전하다.
- `StatusBadge` 통합: 상태별 의미가 주문/결제/배송/신청에 걸쳐 있어, 상태 문구와 tone 매핑 승인 후 진행해야 한다.
- `/services/apply`, `/checkout`, `/mypage`, `/products/[id]`의 카드/CTA 대형 리팩터링: 기능 로직과 결합된 영역이 많으므로 화면별 작은 PR로 분리해야 한다.
- 강한 shadow/gradient 제거: 브랜드 톤 변경으로 체감될 수 있어 디자인 기준 승인 후 단계적으로 조정해야 한다.

## 9. 다음 단계 추천 작업

1. 디자인 토큰 기준 확정
   - radius: 버튼 `rounded-xl`, 표면 `rounded-2xl`, 내부 박스 `rounded-xl`, badge `rounded-full|rounded-md`로 제한.
   - shadow: 기본 `shadow-sm`, hover/elevated `shadow-md`, floating only `shadow-xl`로 용도 정의.
   - surface: page `bg-background`, card `bg-card`, soft panel `bg-muted/20~30`, section header `bg-muted/30`로 제한.
2. Button 사용 기준 확정
   - `default`: 화면의 주 CTA 1개.
   - `outline`: 보조 이동/뒤로가기/상세 보기.
   - `secondary`: 선택 옵션/중립 버튼 또는 outline과 통합 여부 결정.
   - `ghost`: 테이블/목록의 낮은 강조 아이콘 액션.
   - `destructive`: 삭제/취소 확정 등 위험 액션만.
3. Badge 통합
   - 신규 사용처는 `Badge variant={spec.variant}` 또는 `StatusBadge tone`로만 사용.
   - 직접 className 색상 배지는 `badge-style.ts` tone 함수로 이동.
4. `/services/apply`부터 공용 컴포넌트 적용
   - 신청 플로우는 step, summary, CTA가 명확해 `StepIndicator`, `SummaryCard`, `PrimaryCTAGroup` 기준을 만들기 좋다.
5. `/checkout`과 `/products/[id]`에 `PriceSummary` 적용
   - 금액/배송/포인트/총합 row를 통일해 결제 화면 신뢰도를 높인다.
6. `/mypage`에 `StatusBadge`, `SummaryCard`, `EmptyState` 적용
   - 주문/대여/신청 상태를 동일 tone으로 정리한다.

## 10. 공용 디자인 컴포넌트 기준 코드화

이번 단계에서는 실제 사용자 플로우를 바꾸지 않고, 후속 페이지 개선에서 반복 사용할 표현 전용 컴포넌트만 추가한다.

- `SummaryCard`: 주문 요약, 신청 요약, 요금 요약, 상태 요약처럼 제목/설명/액션/본문/푸터가 필요한 요약 패널에 사용한다. 기본 표면은 `rounded-2xl border border-border bg-card shadow-sm` 기준을 따른다.
- `PriceSummary`: 상품가, 장착비, 배송비, 포인트, 할인, 총액 등 이미 계산된 label/value row를 일관되게 표시한다. 금액 계산이나 상태 분기는 컴포넌트 내부에서 하지 않는다.
- `EmptyState`: 이미 `components/public/EmptyState.tsx`에 title, description, action, 선택 icon 구조가 있으므로 신규 중복 구현 없이 유지한다.
- `PrimaryCTAGroup`: 주요 CTA 1개와 보조 CTA 1~2개를 모바일 세로 full-width, 데스크톱 가로 배치로 정렬한다. 라우팅이나 클릭 상태 변경은 만들지 않고 전달받은 노드만 렌더링한다.
- `StepIndicator`: 이미 `components/public/StepIndicator.tsx`에 steps/currentStep 기반 current/completed/upcoming 표현이 있으므로 신규 중복 구현 없이 유지한다.
- `StatusBadge`: 신규 중복 구현은 하지 않는다. 새 사용처에서는 `components/ui/badge.tsx`의 `Badge`와 `lib/badge-style.ts`의 `*BadgeSpec`, `badgeToneVariant` 계열을 조합하는 방향으로 점진 적용한다.
