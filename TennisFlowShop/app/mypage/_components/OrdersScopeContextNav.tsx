"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type NextTodoCalloutProps = {
  label: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  className?: string;
  description?: string;
};

export function NextTodoCallout({
  label,
  ctaLabel,
  ctaHref,
  onCtaClick,
  className,
  description = "아래 버튼으로 바로 처리할 수 있습니다.",
}: NextTodoCalloutProps) {
  const actionLabel = `${ctaLabel}: ${label}`;
  const actionNode = ctaHref ? (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="h-9 w-full border-primary/30 bg-background/80 text-foreground hover:bg-primary/10 bp-sm:w-auto"
    >
      <Link href={ctaHref} aria-label={actionLabel}>
        {ctaLabel}
        <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Link>
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 w-full border-primary/30 bg-background/80 text-foreground hover:bg-primary/10 bp-sm:w-auto"
      onClick={onCtaClick}
      aria-label={actionLabel}
    >
      {ctaLabel}
      <ArrowRight className="ml-1 h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10 dark:bg-primary/10",
        className,
      )}
    >
      <div className="flex flex-col gap-4 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            지금 해야 할 일
          </p>
          <p className="text-base font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="w-full shrink-0 bp-sm:w-auto">{actionNode}</div>
      </div>
    </div>
  );
}
