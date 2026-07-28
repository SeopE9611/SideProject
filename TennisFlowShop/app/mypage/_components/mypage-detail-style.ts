export const mypageDetailLayout = {
  heroSection: "rounded-2xl border border-border/70 bg-card p-4 shadow-soft bp-sm:p-5",
  heroShell: "mt-5 flex w-full flex-col gap-4 border-t border-border/60 pt-4",
  heroGrid: "grid gap-4",
  summaryGrid:
    "grid grid-cols-1 gap-3 border-t border-border/60 pt-4 bp-sm:grid-cols-2 bp-lg:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]",
  contentContainer:
    "space-y-4 py-4 bp-sm:space-y-5 bp-sm:py-5",
  contentGrid: "grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] bp-lg:items-start",
  mainColumn: "space-y-5",
  sideColumn: "space-y-5",
  subtlePanel: "rounded-xl border border-border/60 bg-background/70 p-3 bp-sm:p-4",
  actionPanel: "flex flex-col gap-3 rounded-xl bg-brand-highlight-muted/45 p-3 bp-sm:p-4",
} as const;
