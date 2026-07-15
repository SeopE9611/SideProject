"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import Link from "next/link";

export type OrdersFlowScope = "all" | "todo" | "order" | "application" | "rental";

const scrollItemIntoHorizontalView = (
  container: HTMLElement | null,
  item: HTMLElement | null,
) => {
  if (!container || !item) return;

  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const targetLeft =
    container.scrollLeft +
    itemRect.left -
    containerRect.left -
    (containerRect.width - itemRect.width) / 2;
  const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, targetLeft));

  container.scrollTo({
    left: nextScrollLeft,
    behavior: "auto",
  });
};

const SCOPE_ITEMS: Array<{
  value: OrdersFlowScope;
  label: string;
  href: string;
}> = [
  { value: "all", label: "전체", href: "/mypage?tab=orders" },
  { value: "todo", label: "해야 할 일", href: "/mypage?tab=orders&scope=todo" },
  { value: "order", label: "주문", href: "/mypage?tab=orders&scope=order" },
  {
    value: "application",
    label: "서비스 신청",
    href: "/mypage?tab=orders&scope=application",
  },
  { value: "rental", label: "대여", href: "/mypage?tab=orders&scope=rental" },
];

export const parseOrdersScope = (value: string | null): OrdersFlowScope | null => {
  if (value === "todo" || value === "order" || value === "application" || value === "rental")
    return value;
  if (value === "all") return "all";
  return null;
};

export const resolveOrdersScopeContext = (
  backUrl: string | undefined,
  fallbackScope: OrdersFlowScope,
): OrdersFlowScope => {
  const query = new URLSearchParams((backUrl ?? "").split("?")[1] ?? "");
  const fromBackUrl = parseOrdersScope(query.get("scope"));
  if (fromBackUrl) return fromBackUrl;
  if (fallbackScope) return fallbackScope;
  return "all";
};

type OrdersScopeTabsProps = {
  activeScope: OrdersFlowScope;
  className?: string;
};

export default function OrdersScopeTabs({ activeScope, className }: OrdersScopeTabsProps) {
  const scopeNavRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = scopeNavRef.current;
    const activeLink = container?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );

    scrollItemIntoHorizontalView(container, activeLink ?? null);
  }, [activeScope]);

  return (
    <nav
      ref={scopeNavRef}
      className={cn(
        "overflow-x-auto rounded-control border border-border bg-card p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="거래/이용내역 하위 탭"
    >
      <div className="flex min-w-max items-center gap-1">
        {SCOPE_ITEMS.map((item) => {
          const isActive = item.value === activeScope;
          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-11 min-w-fit items-center gap-2 whitespace-nowrap rounded-control px-3.5 py-2.5 text-ui-label font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bp-sm:px-4 bp-sm:text-ui-body-sm",
                isActive
                  ? "bg-surface-inverse text-surface-inverse-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" aria-hidden="true" /> : null}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
