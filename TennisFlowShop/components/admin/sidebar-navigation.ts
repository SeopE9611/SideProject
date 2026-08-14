import type { ComponentType } from "react";
import {
  Boxes,
  BookOpen,
  CalendarClock,
  ChartBar,
  CreditCard,
  LayoutDashboard,
  ClipboardList,
  Cog,
  History,
  Inbox,
  Library,
  MessageCircle,
  Package,
  PackageSearch,
  Settings,
  Star,
  Store,
  Users,
} from "lucide-react";
import { MdSportsTennis } from "react-icons/md";

export type SidebarBadgeKey =
  | "operations"
  | "orders"
  | "rentals"
  | "offline"
  | "academyApplications"
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
  badgeLabel?: string;
};

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const revenueReportItem: SidebarItem = {
  title: "매출 리포트",
  href: "/admin/reports/revenue",
  icon: ChartBar,
};

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: "오늘 업무",
    items: [
      {
        title: "대시보드",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "운영 업무",
        href: "/admin/operations",
        icon: Inbox,
        key: "operations",
        badgeLabel: "확인",
      },
      {
        title: "주문 관리",
        href: "/admin/orders",
        icon: PackageSearch,
        key: "orders",
        badgeLabel: "확인",
      },
      {
        title: "대여 관리",
        href: "/admin/rentals",
        icon: ClipboardList,
        key: "rentals",
        badgeLabel: "확인",
      },
      {
        title: "오프라인 관리",
        href: "/admin/offline",
        icon: Store,
        key: "offline",
        badgeLabel: "확인",
      },
      {
        title: "아카데미 신청 관리",
        href: "/admin/academy/applications",
        icon: BookOpen,
        key: "academyApplications",
        badgeLabel: "확인",
      },
      {
        title: "교체서비스 예약 설정",
        href: "/admin/scheduling",
        icon: CalendarClock,
      },
    ],
  },
  {
    label: "상품/콘텐츠",
    items: [
      {
        title: "상품 관리",
        href: "/admin/products",
        icon: Boxes,
        key: "products",
        badgeLabel: "확인",
      },
      {
        title: "라켓 관리",
        href: "/admin/rackets",
        icon: MdSportsTennis,
        key: "rackets",
        badgeLabel: "확인",
      },
      {
        title: "패키지 관리",
        href: "/admin/packages",
        icon: Package,
        key: "packages",
        badgeLabel: "확인",
      },
      {
        title: "패키지 설정",
        href: "/admin/packages/settings",
        icon: Cog,
      },
      {
        title: "아카데미 클래스",
        href: "/admin/academy/classes",
        icon: Library,
      },
      {
        title: "게시판 관리",
        href: "/admin/boards",
        icon: MessageCircle,
        key: "boards",
        badgeLabel: "확인",
      },
      {
        title: "후기 관리",
        href: "/admin/reviews",
        icon: Star,
        key: "reviews",
        badgeLabel: "확인",
      },
    ],
  },
  {
    label: "고객/운영",
    items: [
      { title: "회원 관리", href: "/admin/users", icon: Users, key: "users", badgeLabel: "확인" },
      { title: "개인결제 관리", href: "/admin/private-payments", icon: CreditCard },
      {
        title: "정산 관리",
        href: "/admin/settlements",
        icon: ChartBar,
        key: "settlements",
        badgeLabel: "확인",
      },
      revenueReportItem,
      { title: "감사 로그", href: "/admin/audit", icon: History },
      { title: "시스템 설정", href: "/admin/settings", icon: Settings },
    ],
  },
];
