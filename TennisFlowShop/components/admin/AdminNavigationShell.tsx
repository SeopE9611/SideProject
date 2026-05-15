"use client";

import useSWR from "swr";

import AdminMobileMenu from "@/components/admin/AdminMobileMenu";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { SidebarBadgeKey } from "@/components/admin/sidebar-navigation";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";

type BadgeCounts = Partial<Record<SidebarBadgeKey, number>>;

type NavigationSummaryResponse = {
  counts?: BadgeCounts;
};

function normalizeCounts(data?: NavigationSummaryResponse): BadgeCounts {
  const counts = data?.counts;
  if (!counts) return {};
  return counts;
}

export default function AdminNavigationShell() {
  const { data } = useSWR<NavigationSummaryResponse>(
    "/api/admin/navigation-summary",
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );
  const badgeCounts = normalizeCounts(data);

  return (
    <>
      <div className="hidden xl:block">
        <AdminSidebar defaultCollapsed={false} badgeCounts={badgeCounts} />
      </div>
      <div className="mb-4 xl:hidden">
        <AdminMobileMenu badgeCounts={badgeCounts} />
      </div>
    </>
  );
}
