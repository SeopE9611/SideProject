import { FileText, ImageIcon, Package } from "lucide-react";

import SiteContainer from "@/components/layout/SiteContainer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  boardLabel: string;
  isMarket?: boolean;
};

const FormSection = ({
  icon: Icon,
  fields = 2,
  largeLastField = false,
}: {
  icon: typeof FileText;
  fields?: number;
  largeLastField?: boolean;
}) => (
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
          <Skeleton className={index === fields - 1 && largeLastField ? "h-36 w-full rounded-control" : "h-11 w-full rounded-control"} />
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
              <FormSection icon={Package} fields={2} />
              <FormSection icon={Package} fields={4} largeLastField />
              <FormSection icon={Package} fields={7} />
              <FormSection icon={FileText} fields={2} largeLastField />
              <FormSection icon={ImageIcon} fields={3} largeLastField />
              <section className="rounded-panel border border-border bg-card p-5 shadow-soft md:p-6">
                <div className="space-y-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-14 w-full rounded-control" /></div>
                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Skeleton className="h-10 w-full rounded-control sm:w-20" /><Skeleton className="h-10 w-full rounded-control sm:w-28" /></div>
              </section>
            </div>
            <aside className="hidden flex-shrink-0 lg:sticky lg:top-24 lg:block lg:w-[300px] lg:self-start xl:w-[320px]">
              <div className="space-y-4">
                <FormSection icon={Package} fields={8} />
                <FormSection icon={Package} fields={5} />
              </div>
            </aside>
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
