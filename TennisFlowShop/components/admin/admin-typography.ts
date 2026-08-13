// 관리자 공용 타이포 토큰
// text-ui-* 토큰을 우선 연결하고, 관리자 화면 전용 크기/대비는 이 파일에서만 보정합니다.

export const adminTypography = {
  pageTitle: "break-keep text-ui-page-title-lg font-semibold tracking-tight text-foreground",
  sectionTitle: "break-keep text-ui-section-title font-semibold tracking-tight text-foreground",
  panelTitle: "text-ui-body-sm font-semibold tracking-normal text-foreground",
  panelTitleCompact: "text-ui-label font-semibold tracking-normal text-foreground/85",
  body: "text-ui-body-sm leading-relaxed text-foreground",
  bodyStrong: "text-ui-body-sm font-medium tracking-normal text-foreground",
  meta: "text-ui-label leading-relaxed text-foreground/80",
  metaMuted: "text-ui-label leading-relaxed text-foreground/80",
  caption: "text-ui-label leading-snug text-muted-foreground",
  tableHeader: "text-ui-label font-semibold leading-snug text-foreground",
  tablePrimary: "text-ui-body-sm font-medium leading-relaxed text-foreground",
  tableSecondary: "text-ui-label leading-relaxed text-foreground/80",
  numeric: "text-ui-body-sm font-medium tabular-nums text-foreground",
  money: "text-ui-body-sm font-semibold tabular-nums text-foreground",
  date: "text-ui-label tabular-nums text-foreground/80",
  kpiValue: "text-2xl font-bold tabular-nums tracking-tight text-foreground",
  kpiValueCompact: "text-xl font-bold tabular-nums tracking-tight text-foreground",
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
  card: "rounded-xl border border-border bg-card",
  cardMuted: "rounded-xl border border-border bg-muted/20",
  filterCard: "rounded-xl border border-border/70 bg-card/70 p-4",
  tableCard: "overflow-hidden rounded-xl border border-border bg-card",
  tableHeader: "bg-muted/30",
  detailCard: "rounded-xl border border-border bg-card",
  detailHeader: "border-b border-border/70 bg-muted/15 px-5 py-3",
  detailContent: "space-y-4 p-5",
  fieldPanel: "rounded-lg border border-border/60 bg-background p-3",
  fieldPanelMuted: "rounded-lg border border-border/60 bg-muted/20 p-3",
  highlightPanel: "rounded-lg border border-primary/20 bg-primary/[0.03] p-3",
  tableRow:
    "group border-b border-border transition-colors hover:bg-muted/25 data-[state=selected]:bg-muted/50",
  tableCell: "px-4 py-3 align-middle text-ui-body-sm",
  tablePrimaryText: "text-ui-body-sm font-medium leading-relaxed text-foreground",
  tableSecondaryText: "text-ui-label leading-relaxed text-foreground/80",
  nextAction: "rounded-xl border border-primary/20 bg-primary/[0.03]",
  statusGrid: "grid grid-cols-4 gap-2",
  stickyToolbar:
    "rounded-xl border border-border bg-card/95 supports-[backdrop-filter]:bg-card/95",
  kpiCard:
    "rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30",
} as const;
