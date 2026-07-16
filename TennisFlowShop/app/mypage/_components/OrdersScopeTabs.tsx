import { cn } from "@/lib/utils";
import Link from "next/link";

export type OrdersFlowScope = "all" | "todo" | "order" | "application" | "rental";

export const SCOPE_ITEMS: Array<{
  value: OrdersFlowScope;
  label: string;
  shortLabel: string;
  href: string;
}> = [
  { value: "all", label: "전체", shortLabel: "전체", href: "/mypage?tab=orders" },
  { value: "todo", label: "확인할 항목", shortLabel: "확인", href: "/mypage?tab=orders&scope=todo" },
  { value: "order", label: "주문", shortLabel: "주문", href: "/mypage?tab=orders&scope=order" },
  {
    value: "application",
    label: "서비스 신청",
    shortLabel: "서비스",
    href: "/mypage?tab=orders&scope=application",
  },
  { value: "rental", label: "대여", shortLabel: "대여", href: "/mypage?tab=orders&scope=rental" },
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
        "rounded-control border border-border bg-card p-1",
        className,
      )}
      aria-label="거래/이용내역 하위 탭"
    >
      <div className="grid grid-cols-5 gap-1">
        {SCOPE_ITEMS.map((item) => {
          const isActive = item.value === activeScope;
          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-1.5 py-2.5 text-ui-label font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bp-sm:px-4 bp-sm:text-ui-body-sm",
                isActive
                  ? "bg-surface-inverse text-surface-inverse-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" aria-hidden="true" /> : null}
              <span className="bp-sm:hidden" title={item.label}>{item.shortLabel}</span>
              <span className="hidden bp-sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
