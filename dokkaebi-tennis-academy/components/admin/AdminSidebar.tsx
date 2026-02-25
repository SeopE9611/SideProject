'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { SIDEBAR_SECTIONS, type SidebarBadgeKey } from '@/components/admin/sidebar-navigation';
import { isAdminNavActive } from '@/lib/admin-nav';
import { adminTypography } from '@/components/admin/admin-typography';

type BadgeCounts = Partial<Record<SidebarBadgeKey, number>>;
type Props = { defaultCollapsed?: boolean; badgeCounts?: BadgeCounts };

export default function AdminSidebar({ defaultCollapsed = false, badgeCounts = {} }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    const saved = localStorage.getItem('admin.sidebar.collapsed');
    if (saved != null) setCollapsed(saved === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('admin.sidebar.collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <TooltipProvider delayDuration={10}>
      <aside
        className={cn(
          'sticky top-14 h-[calc(100vh-3.5rem)] shrink-0',
          'border-r border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60',
          'dark:bg-background/70 dark:border-border',
          'transition-[width] duration-300 ease-in-out will-change-[width]',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className={cn('relative flex items-center justify-between', collapsed ? 'px-2 py-2' : 'px-3 py-3')}>
          {!collapsed && <div className="text-sm font-semibold tracking-tight text-foreground">도깨비 테니스</div>}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-background dark:border-border dark:bg-card dark:text-muted-foreground"
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <Separator />

        <nav className="mt-2 h-[calc(100%-2.75rem)] overflow-y-auto px-2 pb-8">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.label} className="mt-3">
              <div className={cn('px-3', adminTypography.sidebarSection, collapsed && 'px-0 text-center')}>{section.label}</div>
              <ul className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isAdminNavActive(pathname ?? '', item.href);
                  const count = item.key ? badgeCounts[item.key] : undefined;

                  const link = (
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none transition-colors',
                        active ? 'bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-primary/20' : 'text-muted-foreground hover:bg-primary/10 dark:text-muted-foreground dark:hover:bg-primary/20 hover:text-foreground',
                      )}
                    >
                      <span className={cn('absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-primary transition-all', active ? 'w-1.5 opacity-100' : 'w-0 opacity-0 group-hover:w-1 group-hover:opacity-60')} />
                      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                      {!!count && !collapsed && (
                        <Badge variant="secondary" className={cn("ml-auto", adminTypography.sidebarCount)}>
                          {count > 99 ? '99+' : count}
                        </Badge>
                      )}
                    </Link>
                  );

                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className={cn('mt-6 px-3', adminTypography.sidebarFooter, collapsed && 'px-0 text-center')}>v1.0 • 관리자</div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}
