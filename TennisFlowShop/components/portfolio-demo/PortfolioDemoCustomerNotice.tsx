"use client";

import { isAdminRole } from "@/lib/admin/roles";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function PortfolioDemoCustomerNotice() {
  const { user, loading } = useCurrentUser();

  if (loading || user?.isDemoInteraction !== true || isAdminRole(user.role)) return null;

  return (
    <aside className="border-b border-border bg-brand-highlight-muted/35 px-4 py-2.5" aria-label="고객 데모 안내">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <p className="shrink-0 text-ui-body-sm font-semibold text-foreground">
          포트폴리오 데모 · 고객 체험 모드
        </p>
        <p className="break-keep text-ui-label text-muted-foreground">
          주문·교체서비스·대여·아카데미 기능을 직접 체험할 수 있습니다.
          <span className="hidden lg:inline"> 관리자 화면도 사용자 메뉴에서 바로 확인할 수 있습니다.</span>
        </p>
      </div>
    </aside>
  );
}
