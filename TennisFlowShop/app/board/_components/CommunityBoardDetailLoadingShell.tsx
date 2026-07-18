import { MessageSquare, PackageSearch } from "lucide-react";

import SiteContainer from "@/components/layout/SiteContainer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  boardLabel: string;
  isMarket?: boolean;
};

export default function CommunityBoardDetailLoadingShell({ boardLabel, isMarket = false }: Props) {
  return (
    <main className="min-h-screen bg-background text-foreground" aria-busy="true" aria-live="polite">
      <span className="sr-only">{boardLabel} 상세 화면을 불러오는 중입니다.</span>
      <SiteContainer className="space-y-6 py-6 md:space-y-8 md:py-8">
        <section className="rounded-panel border border-border bg-brand-highlight-muted/45 p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">게시판</Badge>
                <span className="text-ui-label text-muted-foreground">{boardLabel} › 글 상세</span>
              </div>
              <Skeleton className="h-8 w-4/5 max-w-2xl" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-control sm:w-28" />
          </div>
        </section>

        <Card variant="feature" className="overflow-hidden rounded-panel shadow-soft">
          <CardHeader className="border-b border-border bg-brand-highlight-muted/35 p-5 md:p-6">
            <Skeleton className="h-7 w-2/3" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 md:p-6">
            {isMarket ? (
              <div className="grid gap-3 rounded-panel border border-border bg-card p-4 shadow-soft md:grid-cols-4">
                <Skeleton className="h-16 md:col-span-1" />
                <Skeleton className="h-16 md:col-span-1" />
                <Skeleton className="h-16 md:col-span-1" />
                <Skeleton className="h-16 md:col-span-1" />
              </div>
            ) : null}
            <div className="rounded-panel border border-border bg-card p-4 shadow-soft md:p-6">
              <Skeleton className="mb-4 h-48 w-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="feature" className="rounded-panel shadow-soft">
          <CardHeader className="border-b border-border bg-brand-highlight-muted/35 p-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Skeleton className="h-6 w-28" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-24 w-full rounded-control" />
            {[0, 1].map((i) => (
              <div key={i} className="rounded-panel border border-border bg-card p-4 shadow-soft">
                <div className="mb-3 flex items-center gap-3">
                  <PackageSearch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </SiteContainer>
    </main>
  );
}
