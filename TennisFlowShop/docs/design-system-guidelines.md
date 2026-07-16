# 디자인 시스템 사용 기준 (1차)

## 1. 목적

- 이 문서는 UI 수정 시 사용하는 디자인 시스템 기준입니다.
- 색상 토큰의 단일 기준(SSOT)은 `docs/color-token-policy.md`를 따릅니다.

## 2. 색상 사용 원칙

- 일반 UI는 `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` 등 의미 토큰을 우선 사용합니다.
- `blue`, `emerald`, `red` 등 raw palette 클래스 직접 사용은 금지합니다.
- 상태색은 `success`/`warning`/`info`/`destructive` 역할에 맞게 사용합니다.
- 브랜드 예외는 `docs/brand-color-exception-whitelist.md` 기준으로만 허용합니다.
- 상태 의미 매핑은 `docs/status-color-dictionary.md`를 함께 참고합니다.

## 3. Radius 사용 기준

- 작은 버튼/칩/배지: `rounded-md` 또는 `rounded-lg`
- 일반 카드/필터 패널: `rounded-xl` 또는 `rounded-2xl`
- 대형 히어로/큰 프로모션 박스: `rounded-2xl` 또는 `rounded-3xl`
- 아바타/알림 점/원형 아이콘: `rounded-full`
- `adminSurface.card` 계열은 기존 `rounded-2xl` 기준을 유지합니다.

> 주의: radius 토큰 값 자체를 변경하지 말고, 위 기준에 맞춰 선택만 통일합니다.

## 4. Typography 사용 기준

- 페이지 제목: `text-2xl` 이상 + `font-semibold` 또는 `font-bold`
- 섹션 제목: `text-lg` 또는 `text-xl` + `font-semibold`
- 본문: `text-sm` 또는 `text-base`
- 설명/보조 문구: `text-xs` 또는 `text-sm` + `text-muted-foreground`
- 관리자 화면은 `components/admin/admin-typography.ts`를 우선 사용합니다.
- 중요한 값/상태/금액은 `text-muted-foreground`가 아니라 `text-foreground` 또는 의미 토큰을 사용합니다.
- 다크 모드에서 핵심 텍스트를 `text-muted-foreground`로 낮추지 않습니다. (`docs/dark-mode-semantic-checklist.md` 참고)

## 5. Layout Container 사용 기준

- 일반 사용자 페이지는 가능한 `components/layout/SiteContainer` 사용을 우선합니다.
- `default`: 일반 콘텐츠 페이지
- `wide`: 목록/그리드/상품 탐색처럼 넓은 화면이 필요한 페이지
- `full`: 특수 레이아웃에서만 사용
- admin 페이지는 `AdminNavigationShell` 또는 기존 admin layout 기준을 우선하며, 무리하게 `SiteContainer`로 바꾸지 않습니다.
- checkout, admin operations, 복잡한 상세 페이지는 별도 구조가 있으므로 일괄 치환하지 않습니다.

## 6. Badge 사용 기준

- `lib/badge-style.ts`의 `badgeBase`, `badgeSizeSm`, `badgeToneClass`를 우선 사용합니다.
- 상태 의미는 `neutral`/`info`/`success`/`warning`/`danger`/`brand`/`destructive` 기준을 따릅니다.
- 상태 전달 시 색상만 사용하지 말고 텍스트 라벨을 함께 제공합니다.

## 7. 수정 시 체크리스트

- raw color class를 추가하지 않았는가?
- 핵심 값에 `text-muted-foreground`를 사용하지 않았는가?
- 모바일 좌우 여백이 `SiteContainer` 기준과 맞는가?
- 카드 radius가 화면 내에서 과하게 섞이지 않는가?
- dark mode에서 대비가 충분한가?
- 상태 배지가 색상 + 텍스트로 의미 전달이 되는가?

## 9. Dokkaebi Design System V2 primitive 기준

- Hero: `font-brand-display`, `text-ui-display`/`text-ui-display-lg`, `text-brand-outline`를 조합할 수 있습니다. 실제 제목으로 사용할 때는 외곽선 효과보다 대비와 가독성을 우선합니다.
- Feature card: 라켓 케어 상태 카드, 마케팅 기능 패널, Hero 내부 핵심 UI에는 `Card`의 `feature` variant와 `rounded-panel`, `shadow-soft`를 사용합니다.
- Floating card: D-day, 플레이 빈도, 텐션 정보처럼 Hero 주변 보조 정보에는 `Card`의 `floating` variant와 `shadow-float`를 사용합니다. 모바일에서는 일반 흐름으로 배치합니다.
- Inverse section: 검정형 가치 설명 섹션은 `surface-inverse` 계열 토큰만 사용하고 raw black/white 클래스를 사용하지 않습니다.
- `brand-highlight`: 채움 CTA, stroke/progress, inverse surface 위 숫자·시그널에 제한적으로 사용합니다. 밝은 표면 위 작은 텍스트·아이콘은 `brand-highlight-ink`를 사용하고, 상태 의미 전달에는 사용하지 않습니다.
- Radius: `rounded-control`은 버튼·작은 카드, `rounded-panel`은 대형 카드, `rounded-hero`는 Hero 컨테이너에 사용합니다.
- Shadow: `shadow-soft`는 넓은 패널, `shadow-float`는 부유 정보 카드에 사용합니다.
- Outline text: Hero 장면의 제한적 표현이며 일반 본문, 버튼, 폼에는 사용하지 않습니다.
- 체크아웃/관리자는 V2 적용 강도를 낮게 유지하고 결제·업무 흐름의 안정성을 우선합니다.

## 10. DashboardSectionPanel 사용 기준

- 사용자 대시보드와 마이페이지 탭 shell처럼 `카드 표면 → 헤더 → 본문` 구조가 반복되는 영역에 사용합니다.
- 단순 콘텐츠 카드나 요약 카드에는 `PublicSurface` 또는 `SummaryCard`를 먼저 사용합니다.
- 관리자 페이지에는 사용하지 않습니다. 관리자 화면은 기존 admin layout과 admin typography 기준을 우선합니다.
- 주문 상세, 대여 상세, 신청 상세처럼 깊은 상세 화면의 모든 카드를 강제로 대체하지 않습니다.
- `feature` variant는 페이지당 제한적으로 사용하고, 상태 의미는 `success`/`warning`/`destructive` 같은 의미 토큰으로 분리합니다.


## 11. 마이페이지 허브 V2 적용 기준

- 마이페이지 허브는 V2 적용 강도를 중간~강함으로 유지하되, 기존 semantic token의 상태 의미를 대체하지 않습니다.
- 사용자 업무 화면에서는 마케팅 Hero 대신 compact Hero를 사용하고, 핵심 사용자 정보와 오늘 처리할 일을 한 화면 안에서 연결합니다.
- 외부 panel은 `rounded-panel`과 `shadow-soft`로 화면 단위를 만들고, 내부 반복 item은 `rounded-control`과 `border` 중심으로 card-in-card 피로감을 줄입니다.
- `highlight` CTA는 page-level primary action에 제한합니다. 거래 카드에서 반복되는 필수 처리 액션은 `highlight_soft`를 사용할 수 있으며, default primary와 filled highlight를 목록 전체에 반복하지 않습니다. 후기 작성처럼 선택적인 활동은 `secondary` 또는 `outline`을 사용합니다.
- 거래 상태색은 `success`, `warning`, `info`, `destructive` 등 semantic status token을 유지하고, `brand-highlight`를 완료·성공 의미로 사용하지 않습니다.
- 상품명, 라켓명, 날짜, 금액, 상태, 버튼, Badge, 다음 행동 문구에는 기본 본문 서체를 사용합니다.

## V2.1 Interaction Foundation

자세한 SSOT는 `docs/dokkaebi-v2-interaction-responsive-policy.md`를 따른다.

- 모든 페이지 CTA는 `Button` 또는 `buttonVariants`를 사용한다.
- 파일 내부에 `buttonBase`, `buttonHighlight` 같은 로컬 recipe를 복제하지 않는다.
- 반복 업무 action은 `highlight_soft`를 사용한다.
- 최상위 destination navigation은 모바일 hidden scroll을 사용하지 않는다.
- identity Badge와 workflow status Badge를 분리한다.
- fixed Header 아래 sticky offset은 `--header-h`를 사용한다.

## Phase 7A / V2.2 Commerce Discovery Foundation

- `CatalogResultsPanel`, `CatalogToolbar`, `ActiveFilterBar`, `CatalogFilterPanelShell`로 상품/라켓 탐색 결과 문법을 통일한다.
- `CatalogCardFrame`, `CatalogPrice`, `CatalogRating`, `CatalogCardSkeleton`은 presentation shell만 담당하며 상품/라켓 도메인 로직을 합치지 않는다.
- Products/Rackets는 Commerce Discovery reference implementation으로 관리한다.
