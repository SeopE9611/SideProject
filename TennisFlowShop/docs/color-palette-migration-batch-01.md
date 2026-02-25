# 색상 팔레트 이관 배치 #01 (admin/settlements)

## 기준 검색식
- `(bg|text|border|from|to|via|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)`

## 우선순위 디렉터리
1. `app/admin`
2. `app/services`
3. `app/board`
4. `app/mypage`

## 파일 리스트 추출 (이번 기능 배치)
- 기능 단위: `app/admin/settlements`
- 대상 파일
  - `app/admin/settlements/_components/KpiCard.tsx`
  - `app/admin/settlements/_components/SettlementsClient_view.tsx`

## 치환 원칙 적용
- 배경/표면: `bg-background`, `bg-card`, `bg-muted`
- 텍스트: `text-foreground`, `text-muted-foreground`
- CTA: `bg-primary text-primary-foreground`
- 강조: `bg-accent text-accent-foreground`
- 상태: `text-success`, `text-warning`, `text-destructive`

## 정책 예외(브랜드) 고정 리스트
아래 파일만 브랜드 식별성 예외를 허용하고, 그 외 파일은 신규 팔레트 클래스 추가를 금지한다.

- `app/login/_components/SocialAuthButtons.tsx`
- `app/login/_components/LoginPageClient.tsx`
- `app/admin/users/_components/UsersClient.tsx`

## 회귀 방지 규칙
- 본 배치 대상 파일에서는 위 검색식에 해당하는 기존 팔레트 클래스를 모두 제거했다.
- 이후 배치 PR에서도 브랜드 예외 파일을 제외한 신규 팔레트 클래스 추가를 금지한다.
