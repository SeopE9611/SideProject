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
