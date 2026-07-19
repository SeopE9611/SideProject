import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { boardLabel: string; isMarket?: boolean };

export function CommunityBoardEditLoadingShell({ boardLabel, isMarket = false }: Props) {
  const sections = isMarket ? ["h-44", "h-56", "h-52", "h-64"] : ["h-32", "h-56", "h-64"];
  return (
    <main className="min-h-screen bg-muted/30" aria-busy="true" aria-live="polite">
      <SiteContainer variant="wide" className="max-w-7xl space-y-6 py-6 md:space-y-8 md:py-10">
        <p className="sr-only">{boardLabel} 수정 화면을 불러오는 중입니다.</p>
        <section className="rounded-panel border border-border bg-brand-highlight-muted/45 p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </section>
        <div className="rounded-panel border border-border bg-brand-highlight-muted/35 p-4 shadow-soft">
          <Skeleton className="h-5 w-full" />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-6">
            {sections.map((height, index) => (
              <section
                key={index}
                className="rounded-panel border border-border bg-card p-5 shadow-soft"
              >
                <Skeleton className="mb-5 h-6 w-40" />
                <Skeleton className={`w-full ${height}`} />
              </section>
            ))}
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          {isMarket && (
            <aside className="hidden w-[300px] space-y-4 lg:block">
              <Skeleton className="h-72 w-full rounded-panel" />
              <Skeleton className="h-48 w-full rounded-panel" />
            </aside>
          )}
        </div>
      </SiteContainer>
    </main>
  );
}
