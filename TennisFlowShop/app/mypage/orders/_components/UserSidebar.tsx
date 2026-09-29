"use client";

import { MYPAGE_NAV_ITEMS, MYPAGE_PROFILE_NAV_ITEM } from "@/app/mypage/_config/mypage-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function UserSidebar({ activeTab }: { activeTab?: string } = {}) {
  const searchParams = useSearchParams();
  const tab = activeTab ?? searchParams.get("tab") ?? "orders";
  const menuItems = [...MYPAGE_NAV_ITEMS, MYPAGE_PROFILE_NAV_ITEM];

  return (
    <div className="space-y-2">
      {menuItems.map(({ label, value, icon: Icon }) => {
        const isProfile = value === MYPAGE_PROFILE_NAV_ITEM.value;
        const href = isProfile ? "/mypage/profile" : `/mypage?tab=${value}`;
        const isActive = tab === value && !isProfile;

        return (
          <Button
            key={value}
            variant="ghost"
            className={cn(
              "group relative h-10 w-full justify-start gap-2.5 rounded-control px-3 transition-colors",
              isActive
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:absolute before:left-0 before:top-2 before:h-6 before:w-[3px] before:rounded-full before:bg-brand-highlight"
                : "text-foreground hover:bg-muted dark:hover:bg-card",
            )}
            asChild
          >
            <Link href={href} replace={!isProfile}>
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80 dark:group-hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "font-medium transition-colors",
                  isActive ? "text-foreground" : "text-foreground group-hover:text-foreground",
                )}
              >
                {label}
              </span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
