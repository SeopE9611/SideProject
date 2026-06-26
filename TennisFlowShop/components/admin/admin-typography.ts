// 관리자 공용 타이포 토큰
// text-ui-* 토큰을 우선 연결하고, 관리자 화면 전용 크기/대비는 이 파일에서만 보정합니다.

export const adminTypography = {
  pageTitle: "break-keep text-ui-page-title font-semibold tracking-tight text-foreground bp-sm:text-ui-page-title-lg",
  sectionTitle: "break-keep text-ui-section-title font-semibold tracking-tight text-foreground",
  panelTitle: "text-ui-body-sm font-semibold tracking-normal text-foreground",
  body: "text-ui-body-sm leading-relaxed text-foreground",
  bodyStrong: "text-ui-body-sm font-semibold tracking-normal text-foreground",
  meta: "text-ui-label leading-relaxed text-foreground/80",
  metaMuted: "text-ui-label leading-relaxed text-foreground/75",
  caption: "text-ui-label leading-snug text-muted-foreground",
  kpiValue: "text-2xl font-bold tabular-nums tracking-tight text-foreground",
  actionLabel: "text-ui-body-sm font-semibold",
  caution: "text-ui-label font-medium text-primary",
  warning: "text-ui-label font-medium text-warning",

  // 공용 컴포넌트 전용 토큰 (badge / row / panel / sidebar)
  badgeLabel: "text-ui-label leading-[1.1]",
  rowMeta: "text-ui-label text-foreground/80",
  panelMeta: "text-ui-label text-foreground/80",
  sidebarSection: "text-ui-label font-semibold uppercase tracking-widest text-foreground/80",
  sidebarCount: "text-ui-label font-medium",
  sidebarFooter: "text-ui-label text-foreground/80",
} as const;

export const adminSurface = {
  card: "rounded-2xl border border-border/70 bg-card shadow-sm",
  cardMuted: "rounded-2xl border border-border/70 bg-muted/30 shadow-sm",
  filterCard: "rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5",
  tableCard: "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
  tableHeader: "bg-muted/40",
  nextAction: "rounded-2xl border border-primary/25 bg-primary/5 shadow-sm",
  statusGrid: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
  stickyToolbar:
    "rounded-2xl border border-border/70 bg-card/95 shadow-sm supports-[backdrop-filter]:bg-card/95",
  kpiCard:
    "rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border",
} as const;
