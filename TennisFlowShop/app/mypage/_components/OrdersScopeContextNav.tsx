"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type NextTodoCalloutProps = {
  label: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  className?: string;
};

export function NextTodoCallout({ label, ctaLabel, ctaHref, onCtaClick, className }: NextTodoCalloutProps) {
  const actionNode: ReactNode = ctaHref ? (
    <Link href={ctaHref}>
      <Button size="sm" variant="outline" className="h-8">
        {ctaLabel}
        <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </Link>
  ) : (
    <Button size="sm" variant="outline" className="h-8" onClick={onCtaClick}>
      {ctaLabel}
      <ArrowRight className="ml-1 h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className={cn("rounded-xl border border-primary/25 bg-primary/5 p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground">
          <span className="font-semibold">다음 해야 할 일:</span> {label}
        </p>
        {actionNode}
      </div>
    </div>
  );
}
