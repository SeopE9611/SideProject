'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, PackageSearch, Boxes, Users, CalendarClock, MessageCircle, Settings, ChevronLeft, ChevronRight, Package, Cog, ChartArea, ChartBar, ClipboardList, Bell, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { MdSportsTennis } from 'react-icons/md';
const SECTIONS = [
  {
    label: '운영',
    items: [
      { title: '운영함(통합)', href: '/admin/operations', icon: Inbox },
      { title: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
      { title: '알림 관리', href: '/admin/notifications', icon: Bell },
      { title: '주문·신청 관리', href: '/admin/orders', icon: PackageSearch, key: 'orders' as const },
      { title: '상품 관리', href: '/admin/products', icon: Boxes, key: 'products' as const },
      { title: '대여(라켓) 관리', href: '/admin/rentals', icon: ClipboardList },
      { title: '라켓 관리', href: '/admin/rackets', icon: MdSportsTennis, key: 'rackets' as const },
      { title: '패키지 관리', href: '/admin/packages', icon: Package, key: 'packages' as const },
      { title: '패키지 설정', href: '/admin/packages/settings', icon: Cog },
      { title: '예약 · 영업일 설정', href: '/admin/scheduling', icon: CalendarClock },
      { title: '정산 관리', href: '/admin/settlements', icon: ChartBar },
    ],
  },
  {
    label: '고객',
    items: [
      { title: '회원 관리', href: '/admin/users', icon: Users, key: 'users' as const },
      { title: '리뷰 관리', href: '/admin/reviews', icon: MessageCircle, key: 'reviews' as const },
    ],
  },
  {
    label: '기타',
    items: [
      { title: '클래스 관리', href: '/admin/classes', icon: CalendarClock },
      { title: '게시판 관리', href: '/admin/boards', icon: MessageCircle },
      { title: '설정', href: '/admin/settings', icon: Settings },
    ],
  },
];

type SidebarBadgeKey = 'orders' | 'products' | 'reviews' | 'users' | 'packages' | 'rackets';
type SidebarItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  key?: SidebarBadgeKey;
};
type SidebarSection = { label: string; items: SidebarItem[] };
const SIDEBAR_SECTIONS: SidebarSection[] = SECTIONS;

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

  // 경로 활성화 판별 함수 (세그먼트 경계 기반)
  // - 정확히 일치하거나, href 뒤에 '/'가 붙은 세그먼트로 시작할 때만 활성 처리
  // - '/admin/packages'는 '/admin/packages/settings' 페이지에서는 활성으로 보지 않도록 예외 처리
  const isActive = (href: string) => {
    const path = pathname || '';

    // 대시보드 특별 처리: '/admin'은 page.tsx에서 '/admin/dashboard'로 즉시 리다이렉트되지만,
    // 라우팅 전환 중 일시적으로 '/admin' 경로가 보일 수 있어 동일하게 활성 처리
    if (href === '/admin/dashboard') {
      return path === '/admin' || path === '/admin/dashboard' || path.startsWith('/admin/dashboard/');
    }

    // 정확히 같으면 활성
    if (path === href) return true;

    // 세그먼트 경계 고려: href 다음은 '/' 로 이어질 때만 하위 경로로 인정
    const withSlash = href.endsWith('/') ? href : href + '/';
    const under = path.startsWith(withSlash);

    // 특수 케이스: '/admin/packages'는 '/admin/packages/settings' 계열에서는 비활성 처리
    if (href === '/admin/packages') {
      if (/^\/admin\/packages\/settings(?:\/|$)/.test(path)) return false;
      return under; // '/admin/packages/...' (예: 상세/목록 등)은 활성
    }
    // '/admin/settings'도 세부 페이지에선 비활성 처리
    if (href === '/admin/settings') {
      if (path.startsWith('/admin/settings/')) return false;
      return under;
    }

    return under;
  };
  return (
    <TooltipProvider delayDuration={10}>
      <aside
        className={cn(
          'sticky top-14 h-[calc(100vh-3.5rem)] shrink-0',
          'border-r border-slate-200/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
          'dark:bg-slate-900/70 dark:border-slate-700',
          'transition-[width] duration-300 ease-in-out will-change-[width]',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className={cn('relative flex items-center justify-between', collapsed ? 'px-2 py-2' : 'px-3 py-3')}>
          {!collapsed && <div className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">도깨비 테니스</div>}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md
                       border border-slate-200 bg-white text-slate-600 hover:bg-slate-50
                       dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <Separator />

        <nav className="mt-2 h-[calc(100%-2.75rem)] overflow-y-auto px-2 pb-8">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.label} className="mt-3">
              <div className={cn('px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400', collapsed && 'px-0 text-center')}>{section.label}</div>
              <ul className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const count = item.key ? badgeCounts[item.key] : undefined;

                  const link = (
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none transition-colors',
                        active ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70',
                      )}
                    >
                      <span className={cn('absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-primary transition-all', active ? 'w-1.5 opacity-100' : 'w-0 opacity-0 group-hover:w-1 group-hover:opacity-60')} />
                      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                      {!!count && !collapsed && (
                        <Badge variant="secondary" className="ml-auto text-[10px] font-medium">
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

          <div className={cn('mt-6 px-3 text-[11px] text-slate-400', collapsed && 'px-0 text-center')}>v1.0 • 관리자</div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}
