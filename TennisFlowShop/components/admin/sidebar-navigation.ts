import type { ComponentType } from "react";
import {
  Boxes,
  BookOpen,
  CalendarClock,
  ChartBar,
  ClipboardList,
  Cog,
  History,
  Inbox,
  Library,
  MessageCircle,
  Package,
  PackageSearch,
  Settings,
  Store,
  Users,
  Bell,
} from "lucide-react";
import { MdSportsTennis } from "react-icons/md";

export type SidebarBadgeKey =
  | "operations"
  | "orders"
  | "rentals"
  | "offline"
  | "academyApplications"
  | "notifications"
  | "products"
  | "reviews"
  | "users"
  | "packages"
  | "rackets"
  | "boards"
  | "settlements";

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

const revenueReportItem: SidebarItem = { title: "매출 리포트", href: "/admin/reports/revenue", icon: ChartBar };

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: "오늘 업무",
    items: [
      { title: "오늘 처리함", href: "/admin/operations", icon: Inbox, key: "operations" },
      { title: "주문·교체서비스 처리", href: "/admin/orders", icon: PackageSearch, key: "orders" },
      { title: "라켓 대여 처리", href: "/admin/rentals", icon: ClipboardList, key: "rentals" },
      { title: "오프라인 접수", href: "/admin/offline", icon: Store, key: "offline" },
      { title: "아카데미 상담", href: "/admin/academy/applications", icon: BookOpen, key: "academyApplications" },
      { title: "교체서비스 예약 설정", href: "/admin/scheduling", icon: CalendarClock },
    ],
  },
  {
    label: "상품/콘텐츠",
    items: [
      { title: "상품 관리", href: "/admin/products", icon: Boxes, key: "products" },
      { title: "라켓 관리", href: "/admin/rackets", icon: MdSportsTennis, key: "rackets" },
      { title: "구매 패키지권 관리", href: "/admin/packages", icon: Package, key: "packages" },
      { title: "판매 패키지 설정", href: "/admin/packages/settings", icon: Cog },
      { title: "아카데미 클래스", href: "/admin/academy/classes", icon: Library },
      { title: "게시판 관리", href: "/admin/boards", icon: MessageCircle, key: "boards" },
      { title: "리뷰 관리", href: "/admin/reviews", icon: MessageCircle, key: "reviews" },
    ],
  },
  {
    label: "고객/운영",
    items: [
      { title: "회원 관리", href: "/admin/users", icon: Users, key: "users" },
      { title: "알림 발송함", href: "/admin/notifications/outbox", icon: Bell, key: "notifications" },
      { title: "월별 정산 관리", href: "/admin/settlements", icon: ChartBar, key: "settlements" },
      revenueReportItem,
      { title: "감사 로그", href: "/admin/audit", icon: History },
      { title: "시스템 설정", href: "/admin/settings", icon: Settings },
    ],
  },
];

const QUICK_ACCESS_PATHS = new Set([
  "/admin/operations",
  "/admin/orders",
  "/admin/rentals",
  "/admin/offline",
  "/admin/academy/applications",
]);

export const ADMIN_MOBILE_QUICK_ITEMS: SidebarItem[] = SIDEBAR_SECTIONS.flatMap(
  (section) => section.items,
).filter((item) => QUICK_ACCESS_PATHS.has(item.href));
