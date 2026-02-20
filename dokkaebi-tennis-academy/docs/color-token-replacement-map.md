# 공통 색상 치환표

> 본 문서는 `docs/color-token-policy.md`를 기준으로 한 치환 예시 문서입니다.  
> 규칙/예외 해석이 충돌하면 `docs/color-token-policy.md`를 우선 적용합니다.

다크/라이트 모두에서 톤 차이를 최소화하면서, `primary/accent/muted` + 시맨틱 토큰(`foreground`, `card`, `border`) 기준으로 정리한 공통 치환표입니다.

## 텍스트
- `text-slate-900`, `text-gray-900`, `text-slate-800`, `text-gray-800` → `text-foreground`
- `text-slate-700`, `text-gray-700` → `text-foreground`
- `text-slate-600`, `text-gray-600`, `text-slate-500`, `text-gray-500` → `text-muted-foreground`
- `text-slate-900 dark:text-slate-100` / `text-gray-900 dark:text-gray-100` → `text-foreground`
- `text-slate-500 dark:text-slate-400` / `text-gray-500 dark:text-gray-400` → `text-muted-foreground`

## 배경
- `bg-white`, `bg-white dark:bg-slate-900` → `bg-card`
- `bg-slate-50`, `bg-gray-50` → `bg-muted`
- `bg-slate-100`, `bg-gray-100` → `bg-muted`
- `bg-gray-200`, `bg-slate-200` → `bg-muted/80`
- `bg-gray-300` → `bg-muted/70`

## 테두리/링
- `border-gray-200`, `border-slate-200` → `border-border`
- `border-slate-100` → `border-border/60`
- `ring-gray-200`, `ring-slate-200` → `ring-border`
- `focus-visible:ring-slate-400` → `focus-visible:ring-ring`

## 그라디언트(중립색)
- `from-slate-50` → `from-background`
- `to-slate-100` → `to-muted`
- `dark:from-slate-900` → `dark:from-background`
- `dark:to-slate-800` → `dark:to-muted`

## 브랜드 예외
- 허용 범위: 카카오/네이버/구글 등 **제휴사 브랜드 식별이 필요한 UI**
- 금지 범위: 일반 피처 UI의 다색 팔레트(장식/강조 목적)는 예외로 인정하지 않음
- 예외 사용 시 반드시 컴포넌트 상단 또는 분기 직전에 브랜드 예외 사유 주석을 남길 것

## 상태색 사용 위치
- 허용: 배지, 토스트, 폼 검증(성공/경고/오류), 위험 버튼
- 금지: 일반 본문 강조, 카드 장식, 섹션 배경 포인트

## 코드리뷰 체크리스트 (허용 클래스 / 금지 클래스)

### 허용 클래스
- `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, `text-success`, `text-warning`
- `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-accent`, `bg-destructive`
- `border-border`, `ring-ring`, `focus-visible:ring-ring`
- 상태 배지(Flow/Kind/Link 포함)는 로컬 클래스 문자열을 직접 작성하지 않고 `lib/badge-style.ts`의 공통 매핑 함수를 사용

### 금지 클래스
- 일반 UI에서 `text-red-*`, `text-blue-*`, `bg-green-*`, `border-yellow-*` 등 raw 팔레트 직접 사용
- 일반 UI에서 `#hex`, `rgb()`, `hsl()` 하드코딩
- `style={{ color: ... }}`, `style={{ background: ... }}`, `style={{ borderColor: ... }}` 형태의 인라인 색상 지정
