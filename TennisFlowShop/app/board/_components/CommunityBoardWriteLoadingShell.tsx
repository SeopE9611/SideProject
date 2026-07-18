import { FileText, ImageIcon, Package } from "lucide-react";

import SiteContainer from "@/components/layout/SiteContainer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  boardLabel: string;
  isMarket?: boolean;
};

const FormSection = ({ icon: Icon, fields = 2 }: { icon: typeof FileText; fields?: number }) => (
  <section className="rounded-panel border border-border bg-card shadow-soft">
    <div className="flex items-center gap-3 border-b border-border bg-brand-highlight-muted/35 px-5 py-4 md:px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-highlight text-brand-highlight-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    <div className="space-y-4 p-5 md:p-6">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className={index === fields - 1 && fields > 2 ? "h-36 w-full rounded-control" : "h-11 w-full rounded-control"} />
        </div>
      ))}
    </div>
  </section>
);

export default function CommunityBoardWriteLoadingShell({ boardLabel, isMarket = false }: Props) {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">{boardLabel} 작성 화면을 불러오는 중입니다.</span>
      <SiteContainer
        variant="wide"
        className={isMarket ? "max-w-7xl space-y-6 py-6 md:space-y-8 md:py-10" : "max-w-5xl space-y-6 py-6 md:space-y-8 md:py-10"}
      >
        <section className="rounded-panel border border-border bg-brand-highlight-muted/45 p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Badge variant="brand">{boardLabel}</Badge><Skeleton className="h-4 w-24" /></div>
              <Skeleton className="h-9 w-56 max-w-full" />
              <Skeleton className="h-5 w-80 max-w-full" />
            </div>
            <Skeleton className="h-9 w-full rounded-control sm:w-28" />
          </div>
        </section>

        {isMarket ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 space-y-6">
              <FormSection icon={Package} fields={3} />
              <FormSection icon={Package} fields={4} />
              <FormSection icon={FileText} fields={3} />
              <FormSection icon={ImageIcon} fields={3} />
              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Skeleton className="h-10 w-full rounded-control sm:w-20" /><Skeleton className="h-10 w-full rounded-control sm:w-28" /></div>
            </div>
            <aside className="w-full space-y-4 lg:sticky lg:top-24 lg:w-80"><FormSection icon={Package} fields={3} /></aside>
          </div>
        ) : (
          <section className="overflow-hidden rounded-panel border border-border bg-card shadow-soft">
            <div className="space-y-3 border-b border-border bg-brand-highlight-muted/35 p-5 md:p-6"><Skeleton className="h-4 w-16" /><Skeleton className="h-11 w-full rounded-control" /></div>
            <div className="space-y-6 p-5 md:p-6"><FormSection icon={FileText} fields={3} /><FormSection icon={ImageIcon} fields={3} /><div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Skeleton className="h-10 w-full rounded-control sm:w-20" /><Skeleton className="h-10 w-full rounded-control sm:w-28" /></div></div>
          </section>
        )}
      </SiteContainer>
    </main>
  );
}
