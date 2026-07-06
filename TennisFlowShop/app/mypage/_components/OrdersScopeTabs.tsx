"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export type OrdersFlowScope = "all" | "todo" | "order" | "application" | "rental";

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
  return (
    <nav
      className={cn(
        "relative overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="거래/이용내역 하위 탭"
    >
      <div className="flex min-w-max items-center gap-x-5 sm:gap-x-7">
        {SCOPE_ITEMS.map((item) => {
          const isActive = item.value === activeScope;
          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative -mb-px flex min-w-fit items-center whitespace-nowrap border-b-2 px-0.5 py-2.5 text-ui-label bp-sm:py-3 bp-sm:text-ui-body-sm",
                "transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                isActive
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
