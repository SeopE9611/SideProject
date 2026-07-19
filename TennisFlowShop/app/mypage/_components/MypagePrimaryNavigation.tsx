import { MYPAGE_NAV_ITEMS } from "@/app/mypage/_config/mypage-navigation";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function MypagePrimaryNavigation() {
  return (
    <TabsList
      aria-label="마이페이지 주요 탭"
      className="grid h-auto grid-cols-12 gap-1 bg-transparent p-0 bp-sm:grid-cols-7"
    >
      {MYPAGE_NAV_ITEMS.map((item, index) => {
        const Icon = item.icon;
        return (
          <TabsTrigger
            key={item.value}
            value={item.value}
            aria-label={item.label}
            title={item.label}
            className={cn(
              "relative col-span-3 flex min-h-11 min-w-0 flex-row items-center justify-center gap-1.5 rounded-control px-1.5 py-2 text-center leading-tight text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-surface-inverse data-[state=active]:text-surface-inverse-foreground data-[state=active]:shadow-sm data-[state=active]:after:absolute data-[state=active]:after:bottom-1 data-[state=active]:after:h-1 data-[state=active]:after:w-1 data-[state=active]:after:rounded-full data-[state=active]:after:bg-brand-highlight bp-sm:col-span-1 bp-sm:px-2",
              index >= 4 && "bp-xs:col-span-4",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate text-ui-label font-medium leading-tight">
              {item.shortLabel}
            </span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
