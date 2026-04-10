"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export type OrdersFlowScope = "all" | "todo" | "order" | "application" | "rental";

const SCOPE_ITEMS: Array<{ value: OrdersFlowScope; label: string; href: string }> = [
  { value: "all", label: "전체", href: "/mypage?tab=orders" },
  { value: "todo", label: "해야 할 일", href: "/mypage?tab=orders&scope=todo" },
  { value: "order", label: "주문", href: "/mypage?tab=orders&scope=order" },
  { value: "application", label: "서비스 신청", href: "/mypage?tab=orders&scope=application" },
  { value: "rental", label: "대여", href: "/mypage?tab=orders&scope=rental" },
];

const parseOrdersScope = (value: string | null): OrdersFlowScope | null => {
  if (value === "todo" || value === "order" || value === "application" || value === "rental") return value;
  if (value === "all") return "all";
  return null;
};

export const resolveOrdersScopeContext = (backUrl: string | undefined, fallbackScope: OrdersFlowScope): OrdersFlowScope => {
  const query = new URLSearchParams((backUrl ?? "").split("?")[1] ?? "");
  const fromBackUrl = parseOrdersScope(query.get("scope"));
  if (fromBackUrl) return fromBackUrl;
  if (fallbackScope) return fallbackScope;
  return "all";
};

type OrdersScopeContextNavProps = {
  activeScope: OrdersFlowScope;
  className?: string;
};

export function OrdersScopeContextNav({ activeScope, className }: OrdersScopeContextNavProps) {
  return (
    <nav className={cn("rounded-xl border border-border/70 bg-card/60 p-2", className)} aria-label="목록 컨텍스트 이동">
      <div className="mb-1 px-1 text-[11px] text-muted-foreground">목록 컨텍스트</div>
      <div className="flex flex-wrap gap-1.5">
        {SCOPE_ITEMS.map((item) => {
          const active = item.value === activeScope;
          return (
            <Link
              key={item.value}
              href={item.href}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-card/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
