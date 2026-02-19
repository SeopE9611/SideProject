# Color Token 적용 규칙 및 예외 목록

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
아래는 제휴사 브랜드 식별성 유지가 필요한 영역으로, 의도적으로 hex를 유지합니다.

- `app/login/_components/SocialAuthButtons.tsx`
  - 카카오/네이버 버튼 배경 및 아이콘, 구글 아이콘 멀티 컬러
  - 파일 상단에 브랜드 예외 주석 명시
- `app/login/_components/LoginPageClient.tsx`
  - 소셜 회원가입 완료 버튼(카카오/네이버) 브랜드 색상
  - 해당 분기 직전에 브랜드 예외 주석 명시
- `app/admin/users/_components/UsersClient.tsx`
  - 소셜 연동 상태 배지(카카오/네이버) 브랜드 식별 색상
  - 배지 렌더링 블록 상단에 브랜드 예외 주석 명시

### 3) 비-UI 범위(참고)
- `lib/shadcn-plugin.js`: 디자인 토큰 원본 정의(hex)로서 정상 범위.
- `app/features/notifications/core/render.ts`: 이메일 HTML 렌더러용 컬러 정의/inline style로 웹 UI 토큰 규칙 적용 대상 외.

## 규칙
- 일반 UI 컴포넌트는 hex/inlined color를 직접 사용하지 않고 디자인 토큰 클래스(`bg-*`, `text-*`, `border-*`)를 사용한다.
- 제휴사 브랜드 아이덴티티가 요구되는 경우에만 예외를 허용한다.
- 예외 컴포넌트에는 파일 상단(또는 해당 분기 직전) 주석으로 **브랜드 예외 사유**를 명시한다.
