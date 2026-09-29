import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import SiteContainer from "@/components/layout/SiteContainer";
import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { PublicSurface } from "@/components/public/PublicSurface";
import { Button } from "@/components/ui/button";

type CommunityComingSoonPageProps = {
  title: string;
  description: string;
  noticeTitle: string;
  features: string[];
  alternative: string;
  icon: LucideIcon;
};

export function CommunityComingSoonPage({
  title,
  description,
  noticeTitle,
  features,
  alternative,
  icon: Icon,
}: CommunityComingSoonPageProps) {
  return (
    <main className="min-h-screen bg-muted/30">
      <SiteContainer variant="wide" className="space-y-6 py-6 bp-sm:py-8 bp-md:py-10">
        <header className="max-w-3xl space-y-2">
          <h1 className="break-keep text-ui-section-title font-ui-bold tracking-normal text-foreground sm:text-ui-section-title-lg">
            {title}
          </h1>
          <p className="text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body">
            {description}
          </p>
        </header>

        <PublicSurface variant="feature" className="space-y-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="min-w-0 break-keep text-ui-card-title-lg font-ui-bold leading-tight text-foreground">
                {noticeTitle}
              </h2>
            </div>
            <SemanticBadge tone="brand" shape="pill" size="md" className="sm:ml-auto">
              Coming Soon
            </SemanticBadge>
          </div>

          <div className="grid gap-5 border-t border-border/80 pt-5 bp-md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
            <div className="min-w-0 space-y-3">
              <h3 className="text-ui-body font-ui-semibold text-foreground">제공 예정 기능</h3>
              <ul className="space-y-2 text-ui-body-sm leading-relaxed text-muted-foreground">
                {features.map((feature) => (
                  <li key={feature} className="flex min-w-0 gap-2 break-words">
                    <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span className="min-w-0">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-4 rounded-panel border border-border/80 bg-muted/30 p-4 sm:p-5">
              <div className="space-y-2">
                <h3 className="text-ui-body font-ui-semibold text-foreground">지금 이용할 수 있는 경로</h3>
                <p className="break-words text-ui-body-sm leading-relaxed text-muted-foreground">
                  {alternative}
                </p>
              </div>
              <Button
                asChild
                variant="highlight_soft"
                size="lg"
                wrap="responsive"
                className="min-h-11 w-full justify-center"
              >
                <Link href="/reviews">
                  리뷰 게시판 둘러보기
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </PublicSurface>
      </SiteContainer>
    </main>
  );
}
