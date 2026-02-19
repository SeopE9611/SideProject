# 공통 색상 치환표

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
- `blue/indigo/purple/emerald/rose/...` 계열(브랜드·상태 표현)은 유지.
