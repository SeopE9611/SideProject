import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = { mode?: "notice" | "event" };

export default function NoticeWriteLoadingShell({ mode = "notice" }: Props) {
  const isEventMode = mode === "event";
  const listHref = isEventMode ? "/board/event" : "/board/notice";

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      <PublicPageHero
        variant="feature"
        eyebrow={
          <Badge variant={isEventMode ? "success" : "highlight"} className="rounded-control">
            {isEventMode ? "Event Editor" : "Notice Editor"}
          </Badge>
        }
        title={isEventMode ? "이벤트 작성" : "공지사항 작성"}
        description={
          isEventMode
            ? "할인, 프로모션, 행사 소식을 회원들에게 전달하세요."
            : "중요한 소식을 회원들에게 전달하세요."
        }
        actions={
          <Button variant="secondary" asChild className="w-full rounded-control bp-sm:w-auto">
            <Link href={listHref}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              목록으로
            </Link>
          </Button>
        }
      />
      <SiteContainer className="py-6 sm:py-8 md:py-10">
        <Card className="mx-auto max-w-4xl overflow-hidden rounded-panel border-border/80 bg-card shadow-soft">
          <div className="h-1 bg-brand-highlight" aria-hidden="true" />
          <CardHeader className="border-b bg-brand-highlight-muted/30">
            <Skeleton className="h-8 w-56" />
          </CardHeader>
          <CardContent className="space-y-5 p-4 md:p-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <PublicSurface key={index} variant="feature" padding="md" className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton
                  className={
                    index === 1 ? "h-48 w-full rounded-control" : "h-12 w-full rounded-control"
                  }
                />
              </PublicSurface>
            ))}
          </CardContent>
        </Card>
      </SiteContainer>
    </main>
  );
}
