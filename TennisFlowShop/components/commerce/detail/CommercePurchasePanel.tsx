import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CommercePurchasePanelProps = {
  eyebrow?: ReactNode;
  badges?: ReactNode;
  title: ReactNode;
  rating?: ReactNode;
  price: ReactNode;
  summary?: ReactNode;
  options?: ReactNode;
  actions: ReactNode;
  utilities?: ReactNode;
  className?: string;
};

export function CommercePurchasePanel({
  eyebrow,
  badges,
  title,
  rating,
  price,
  summary,
  options,
  actions,
  utilities,
  className,
}: CommercePurchasePanelProps) {
  return (
    <Card className={cn("min-w-0 rounded-panel border border-border bg-card shadow-sm", className)}>
      <CardContent className="min-w-0 space-y-5 p-5 sm:p-6 bp-md:p-7">
        <section className="min-w-0 space-y-3">
          {eyebrow ? (
            <div className="min-w-0 text-ui-body-sm font-medium text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          {badges ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">{badges}</div>
          ) : null}
          <div className="min-w-0">{title}</div>
          {rating ? <div className="min-w-0">{rating}</div> : null}
        </section>
        <section className="min-w-0 border-t border-border/60 pt-5">{price}</section>
        {summary ? (
          <section className="min-w-0 border-t border-border/60 pt-5">{summary}</section>
        ) : null}
        {options ? (
          <section className="min-w-0 border-t border-border/60 pt-5">{options}</section>
        ) : null}
        <section className="min-w-0 border-t border-border/60 pt-5">{actions}</section>
        {utilities ? (
          <section className="min-w-0 border-t border-border/60 pt-5">{utilities}</section>
        ) : null}
      </CardContent>
    </Card>
  );
}
