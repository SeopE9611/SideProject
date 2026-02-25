// 관리자 공용 타이포 토큰
// - 본문 최소 크기: text-sm
// - 메타/보조 정보: text-xs + 대비 충족 색상(text-foreground/80 또는 text-muted-foreground)
// - 경고/주의 정보: text-primary 또는 text-warning로 승격

export const adminTypography = {
  body: 'text-sm text-foreground',
  bodyStrong: 'text-sm font-semibold tracking-tight text-foreground',
  meta: 'text-xs text-foreground/80',
  metaMuted: 'text-xs text-muted-foreground',
  caution: 'text-xs font-medium text-primary',
  warning: 'text-xs font-medium text-warning',

  // 공용 컴포넌트 전용 토큰 (badge / row / panel / sidebar)
  badgeLabel: 'text-xs leading-[1.1]',
  rowMeta: 'text-xs text-foreground/80',
  panelTitle: 'text-sm font-semibold tracking-tight text-foreground',
  panelMeta: 'text-xs text-foreground/80',
  sidebarSection: 'text-xs font-semibold uppercase tracking-widest text-foreground/80',
  sidebarCount: 'text-xs font-medium',
  sidebarFooter: 'text-xs text-foreground/80',
} as const;
