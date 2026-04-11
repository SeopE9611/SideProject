"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export type OrdersFlowScope = "all" | "todo" | "order" | "application" | "rental";

const SCOPE_ITEMS: Array<{ value: OrdersFlowScope; label: string; href: string }> = [
  { value: "all", label: "전체", href: "/mypage?tab=orders" },
  { value: "todo", label: "해야 할 일", href: "/mypage?tab=orders&scope=todo" },
  { value: "order", label: "주문", href: "/mypage?tab=orders&scope=order" },
  { value: "application", label: "서비스 신청", href: "/mypage?tab=orders&scope=application" },
  { value: "rental", label: "대여", href: "/mypage?tab=orders&scope=rental" },
];

export const parseOrdersScope = (value: string | null): OrdersFlowScope | null => {
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

type OrdersScopeTabsProps = {
  activeScope: OrdersFlowScope;
  className?: string;
};

export default function OrdersScopeTabs({ activeScope, className }: OrdersScopeTabsProps) {
  return (
    <nav className={cn("relative", className)} aria-label="거래/이용내역 하위 탭">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:gap-2">
        {SCOPE_ITEMS.map((item) => {
          const isActive = item.value === activeScope;
          return (
            <Link
              key={item.value}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium",
                "transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-sm",
              )}
            >
              <span>{item.label}</span>
              {isActive ? <span className="absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary/40" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
