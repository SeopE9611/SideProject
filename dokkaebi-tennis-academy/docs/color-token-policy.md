# Color Token 적용 규칙 및 예외 목록 (Single Source of Truth)

> 이 문서는 색상 토큰 적용의 **단일 기준 문서(SSOT)** 입니다.  
> `docs/color-token-replacement-map.md`는 본 문서의 규칙을 실무 치환 예시로 풀어쓴 보조 문서이며, 해석이 충돌하면 항상 본 문서를 우선합니다.

> 브랜드 예외 허용 파일의 고정 목록은 `docs/brand-color-exception-whitelist.md`를 기준으로 관리합니다.

## 검색 기준
- `#[0-9A-Fa-f]{3,6}`
- `style={{ ... }}` 내부의 `color`, `background`, `border`

## 검색 명령
```bash
rg -n "#[0-9A-Fa-f]{3,6}|style=\{\{[^}]*\b(color|background|border)\b" app components lib
```

## 조치 결과

### 1) 토큰 치환 완료 (일반 UI)
- `app/global-error.tsx`: inline `color/background/border`를 제거하고 `bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-destructive` 등 토큰 클래스로 통일.
- `components/SearchPreview.tsx`: `dark:bg-[#1a2230]`, `dark:bg-[#222e3a]` 제거 후 토큰 배경 사용.
- `components/ui/slider.tsx`: `dark:bg-[#0f172a]` 제거 후 토큰 배경(`bg-background`)만 사용.
- `app/admin/reviews/[id]/loading.tsx`: `text-[#3b82f6]`, `text-[#64748b]`를 `text-primary`, `text-muted-foreground`로 치환.
- `lib/toast.ts`: 오류 토스트 inline style(hex 기반 `background/color/border`)를 토큰 클래스(`bg-destructive/10`, `text-destructive`, `border-destructive/30`)로 치환.
- `app/services/page.tsx`: 미사용 hex color 데이터 필드 제거.

### 2) 브랜드 예외(유지)
아래는 **제휴사(카카오/네이버/구글 등) 브랜드 식별성 유지가 필요한 UI**로, 의도적으로 hex를 유지합니다.

브랜드 예외의 범위:
- 허용: 카카오/네이버/구글 등 **외부 제휴사 브랜드 식별이 필요한 버튼/아이콘/연동 배지**
- 금지: 일반 피처 UI(대시보드, 리스트, 카드, 차트, 통계 패널, 일반 CTA 등)에서의 다색 팔레트 운용

- `app/login/_components/SocialAuthButtons.tsx`
  - 카카오/네이버 버튼 배경 및 아이콘, 구글 아이콘 멀티 컬러
  - 파일 상단에 브랜드 예외 주석 명시
- `app/login/_components/LoginPageClient.tsx`
  - 소셜 회원가입 완료 버튼(카카오/네이버) 브랜드 색상
  - 해당 분기 직전에 브랜드 예외 주석 명시
- `app/admin/users/_components/UsersClient.tsx`
  - 소셜 연동 상태 배지(카카오/네이버) 브랜드 식별 색상
  - 배지 렌더링 블록 상단에 브랜드 예외 주석 명시

### 3) 비-웹UI 예외(참고)
- non-web-ui 예외 목록은 `docs/brand-color-exception-whitelist.md`가 아니라 본 문서의 [이메일 템플릿 예외 정책 (고정)](#이메일-템플릿-예외-정책-고정) 섹션에서 관리한다.
- `app/features/notifications/core/render.ts`: 이메일 HTML 렌더러로 분류하며 웹 UI 토큰 규칙 적용 대상에서 제외.

## 이메일 템플릿 예외 정책 (고정)

`app/features/notifications/core/render.ts`는 메일 클라이언트(예: Gmail, Outlook)의 CSS 지원 제약으로 인해 **인라인 스타일 기반 렌더링이 필수**이므로, `app/globals.css` 토큰 클래스를 직접 적용하지 않는다.

예외 허용 팔레트(고정):
- `surface`: `#FCFFFC` — 메일 본문/카드 배경(고대비, 인쇄/다크 변환 내성)
- `text`: `#1A1C1A` — 제목/본문 기본 텍스트
- `sub`: `#4A544A` — 보조 텍스트/메타 정보
- `line`: `#D7E3D7` — 구분선/테이블 보더
- `bgSoft`: `#F3F8F3` — 요약 표의 key 셀 배경
- `badgeBg`: `#E9F6EC` — 상태 배지 배경
- `badgeText`: `#248232` — 상태 배지 텍스트(브랜드 그린)
- `btnBg`: `#2BA84A` — CTA 배경
- `btnText`: `#1A1C1A` — CTA 텍스트

운영 규칙:
- 위 팔레트 외 임의색(`#888`, `#999`, 임의 `rgb/hsl`) 추가를 금지한다.
- 색상은 반드시 `THEME`의 의미 있는 키를 통해서만 참조한다.
- 팔레트 조정이 필요하면 본 문서 섹션과 `render.ts`를 동시에 수정해 SSOT를 유지한다.


## `lib/shadcn-plugin.js` 참조 전수 점검 결과

실행 명령:

```bash
rg -n "lib/shadcn-plugin|shadcn-plugin" . --glob '!node_modules/**'
```

점검 결과:
- 실제 import/require 경로는 없었고, `eslint.config.mjs`의 ignore 항목과 본 문서의 과거 설명에만 등장했습니다.
- 더 이상 런타임/빌드 경로에서 사용되지 않아 `lib/shadcn-plugin.js` 파일을 제거했습니다.

## 최소 토큰 세트(3색 유지)

고정 팔레트:
- Base Light: `#FCFFFC`
- Base Dark: `#1A1C1A`
- Brand Green: `#248232`
- Accent Green: `#2BA84A`

### Light
- `--background`: `#FCFFFC` (페이지 배경)
- `--card`: `#FFFFFF` (카드/패널)
- `--foreground`: `#1A1C1A` (본문/제목)
- `--muted-foreground`: `#4A544A` (보조 텍스트)
- `--primary`: `#248232` (주요 버튼/브랜드 인터랙션)
- `--primary-foreground`: `#FCFFFC`
- `--accent`: `#2BA84A` (포인트/강조)
- `--accent-foreground`: `#1A1C1A`
- `--border`: `#D7E3D7`

### Dark
- `--background`: `#1A1C1A`
- `--card`: `#222622` (배경 대비 +1단 밝은 표면)
- `--foreground`: `#FCFFFC`
- `--muted-foreground`: `#B9C3B9`
- `--primary`: `#2BA84A` (다크에서 클릭성 강화)
- `--primary-foreground`: `#1A1C1A`
- `--accent`: `#2BA84A`
- `--accent-foreground`: `#1A1C1A`
- `--border`: `#3A433A`

### 상태색(실무 최소)
- `--success`: `#2BA84A`
- `--warning`: `#D97706`
- `--destructive`: `#DC2626`
- `--ring`: `#248232`

상태색 허용 위치(필수 준수):
- 배지: 상태 전달용 `Badge` (`success/warning/destructive`)
- 토스트: 결과 피드백(`성공/경고/실패`) 알림
- 폼 검증: 에러/경고/성공 메시지 및 강조 테두리
- 위험 버튼: 삭제/비활성화/취소 확정 등 파괴적 액션

상태색 금지 위치:
- 장식 목적의 임의 컬러 포인트
- 일반 본문/카드 배경/섹션 타이틀의 브랜드 대체 색

## shadcn/tailwind 매핑 가이드

- 배경/표면: `bg-background`, `bg-card`, `bg-popover`
- 텍스트: `text-foreground`, `text-muted-foreground`
- 주요 CTA: `bg-primary text-primary-foreground`
- 보조 강조: `bg-accent text-accent-foreground`
- 경계/입력: `border-border`, `bg-background`, `ring-ring`
- 위험 액션: `bg-destructive text-destructive-foreground`

권장 원칙:
1. `primary`는 배경색이 아니라 **인터랙션(CTA)** 용도로 유지.
2. 본문은 `text-foreground`, 브랜드 그린은 제목/강조/링크 중심으로 제한.
3. hover/active는 토큰 기반(`primary/90` 또는 별도 `--primary-hover`)으로 정의.
4. 일반 UI는 하드코딩 hex 금지, 브랜드 제휴 UI만 예외 허용.


## `text-muted-foreground` 적용 기준 (다크 모드 가독성 보호)
- `text-muted-foreground`는 **보조 정보**(메타데이터, 설명 문구, 보조 라벨, 타임스탬프)에만 사용한다.
- 페이지/카드의 핵심 제목, 본문 값, 표의 헤더/주요 셀 값은 기본적으로 `text-foreground`를 사용한다.
- 다크 모드에서만 흐려 보이는 문제를 막기 위해 `text-foreground dark:text-muted-foreground` 조합은 사용하지 않는다.
- 상태값 강조(금액, 수량, 상태명)는 우선 `text-foreground` 또는 의미 색상(`text-primary`, `text-destructive`)을 사용한다.
- 점검 체크리스트
  - 제목/주요 데이터가 `text-muted-foreground`면 `text-foreground`로 승격
  - 테이블 헤더가 `text-muted-foreground`면 `text-foreground`로 승격
  - 설명/보조 캡션만 `text-muted-foreground` 유지

## 규칙
- 일반 UI 컴포넌트는 hex/inlined color를 직접 사용하지 않고 디자인 토큰 클래스(`bg-*`, `text-*`, `border-*`)를 사용한다.
- 제휴사 브랜드 아이덴티티(카카오/네이버/구글 등)가 요구되는 경우에만 예외를 허용한다.
- 일반 피처 UI의 다색 팔레트 사용은 브랜드 예외에 포함되지 않는다.
- 예외 컴포넌트에는 파일 상단(또는 해당 분기 직전) 주석으로 **브랜드 예외 사유**를 명시한다.
- 자동 차단 스캔(`npm run check:color-policy`) 기준에서 화이트리스트 외 파일의 hex/raw palette 또는 금지 클래스 조합이 발견되면 CI를 실패시키고 머지할 수 없다.

## scan:color-classes 허용 예외 분리
- `브랜드 화이트리스트`: 카카오/네이버/구글 등 제휴사 식별성 유지 파일만 허용.
- `비-웹UI 화이트리스트`: 이메일 HTML 렌더러 등 웹 UI 토큰 규칙 적용 대상 외 파일만 허용.
- 위 두 화이트리스트 외 파일에서 동일 패턴이 검출되면 `scan:color-classes`는 경고가 아니라 즉시 실패(`exit 1`)한다.
- 스캔 리포트에는 회귀 추적을 위해 다음 3개 지표를 항상 함께 기록한다.
  - `total matches`
  - `matched files`
  - `exception files`


## 차단 기준 (CI Fail Rules)
- `npm run check:color-policy`는 인자 없이 실행 시 `scan:brand-color-exceptions`와 `scan:color-classes`(기본 스캔 범위: `app`, `components`, `lib`)를 순서대로 실행하며, 아래 조건 중 하나라도 충족하면 즉시 `exit 1`로 실패한다.
  - `scan:brand-color-exceptions`: 브랜드 예외 화이트리스트 외 파일에서 `#hex` 또는 raw palette class(`text-blue-500`, `bg-red-100` 등) 발견
  - `scan:color-classes`: 금지 조합 `text-foreground dark:text-muted-foreground` 발견
  - `scan:color-classes`: raw palette class(`slate|gray|...|rose` + `bg|text|border|ring|from|to|via`) 발견
  - `scan:color-classes`: 하드코딩 중립 클래스 `text-white|text-black|bg-(white|black)/*|border-white/*|ring-black/*|dark:ring-white/*` 발견
- 위 실패는 로컬(`pnpm lint`)과 CI(`.github/workflows/ci.yml`의 color policy gate)에서 동일하게 적용한다.
- 브랜드 예외가 필요한 경우 반드시 `docs/brand-color-exception-whitelist.md`와 스크립트 화이트리스트를 함께 업데이트한 뒤 사유를 코드 주석으로 남긴다.

## 코드리뷰 체크리스트 (허용 클래스 / 금지 클래스)

### 허용 클래스
- 텍스트: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, `text-success`, `text-warning`
- 배경: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-accent`, `bg-destructive`
- 테두리/링: `border-border`, `ring-ring`, `focus-visible:ring-ring`
- 상태 UI: 배지/토스트/폼 검증/위험 버튼 내 `success|warning|destructive` 계열 토큰

### 금지 클래스
- 일반 UI에서 `text-red-*`, `text-blue-*`, `bg-green-*`, `border-yellow-*` 등 raw 팔레트 직접 사용
- 일반 UI에서 `#hex`, `rgb()`, `hsl()` 직접 하드코딩
- `style={{ color: ... }}`, `style={{ background: ... }}`, `style={{ borderColor: ... }}` 형태의 인라인 색상 지정
- 브랜드 예외 사유 주석 없이 제휴사 색상(카카오/네이버/구글 등) 사용

## 추가 재스캔 결과 (app/components/lib)
- 실행 명령
  - `rg -n "#[0-9A-Fa-f]{3,6}|style=\{\{[^}]*\b(color|background|border)\b" app components lib`
  - `rg -n "text-blue-|text-emerald-|text-amber-|text-red-|text-slate-|text-gray-|bg-white|bg-blue-|bg-emerald-|bg-amber-|bg-red-|bg-slate-|bg-gray-|border-blue-|border-emerald-|border-amber-|border-red-|border-slate-|border-gray-" app components lib`
- raw 팔레트 잔존 파일 목록: 없음 (0건)


## 토큰 소스 우선순위 (SSOT)

1. **1순위(유일한 정의 소스): `app/globals.css`**
   - `:root`, `.dark`에서 디자인 토큰 CSS 변수를 정의한다.
2. **2순위: `tailwind.config.ts`**
   - 색상 키(`primary`, `background` 등)는 `hsl(var(--...))` 매핑만 수행한다.
   - 변수 값 자체(숫자/HSL/hex)는 정의하지 않는다.
3. **3순위: 개별 컴포넌트(`app/**`, `components/**`, `lib/**`)**
   - 토큰 클래스 사용만 허용하며, 값 재정의는 금지한다.

필수 규칙:
- `globals.css` 이외 경로에서 `--primary`, `--background`를 **재정의하지 않는다**.
- `primary`가 blue 계열(hex `#3b82f6` 등, `text-blue-*`/`bg-blue-*`)로 재등장하지 않도록 CI에서 차단한다.

자동 검증:
- `npm run check:token-palette-consistency`
  - `--primary`, `--background` 재정의가 `app/globals.css` 밖에서 발견되면 실패
  - blue 계열 회귀(`3b82f6`, `blue-*`)가 브랜드 예외 화이트리스트 밖에서 발견되면 실패
