import type { ComponentType } from 'react';
import { LayoutDashboard, PackageSearch, Boxes, Users, CalendarClock, MessageCircle, Settings, Package, Cog, ChartBar, ClipboardList, Bell, Inbox } from 'lucide-react';
import { MdSportsTennis } from 'react-icons/md';

export type SidebarBadgeKey = 'orders' | 'products' | 'reviews' | 'users' | 'packages' | 'rackets';

export type SidebarItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  key?: SidebarBadgeKey;
};

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: '운영',
    items: [
      { title: '운영 통합 센터(주문·대여·신청)', href: '/admin/operations', icon: Inbox },
      { title: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
      { title: '알림 발송함', href: '/admin/notifications/outbox', icon: Bell },
      { title: '주문·신청 관리', href: '/admin/orders', icon: PackageSearch, key: 'orders' },
      { title: '상품 관리', href: '/admin/products', icon: Boxes, key: 'products' },
      { title: '대여(라켓) 관리', href: '/admin/rentals', icon: ClipboardList },
      { title: '라켓 관리', href: '/admin/rackets', icon: MdSportsTennis, key: 'rackets' },
      { title: '패키지 관리', href: '/admin/packages', icon: Package, key: 'packages' },
      { title: '패키지 설정', href: '/admin/packages/settings', icon: Cog },
      { title: '예약 · 영업일 설정', href: '/admin/scheduling', icon: CalendarClock },
      { title: '정산 관리', href: '/admin/settlements', icon: ChartBar },
    ],
  },
  {
    label: '고객',
    items: [
      { title: '회원 관리', href: '/admin/users', icon: Users, key: 'users' },
      { title: '리뷰 관리', href: '/admin/reviews', icon: MessageCircle, key: 'reviews' },
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

const QUICK_ACCESS_PATHS = new Set(['/admin/operations', '/admin/orders', '/admin/users', '/admin/settings']);

export const ADMIN_MOBILE_QUICK_ITEMS: SidebarItem[] = SIDEBAR_SECTIONS.flatMap((section) => section.items).filter((item) => QUICK_ACCESS_PATHS.has(item.href));
