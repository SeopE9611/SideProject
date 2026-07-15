"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Heart,
  MessageCircleQuestion,
  MessageSquare,
  ReceiptCent,
  Ticket,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function UserSidebar({ activeTab }: { activeTab?: string } = {}) {
  const searchParams = useSearchParams();
  const tab = activeTab ?? searchParams.get("tab") ?? "orders";

  // 메뉴 항목 정의
  const menuItems = [
    {
      label: "거래/이용 내역",
      value: "orders",
      icon: ClipboardList,
    },
    {
      label: "클래스 신청",
      value: "academy",
      icon: GraduationCap,
    },
    {
      label: "위시리스트",
      value: "wishlist",
      icon: Heart,
    },
    {
      label: "리뷰 관리",
      value: "reviews",
      icon: MessageSquare,
    },
    {
      label: "문의 내역",
      value: "qna",
      icon: MessageCircleQuestion,
    },
    {
      label: "패키지",
      value: "passes",
      icon: Ticket,
    },
    {
      label: "적립 포인트",
      value: "points",
      icon: ReceiptCent,
    },
    {
      label: "회원 정보 수정",
      value: "profile",
      icon: UserCog,
    },
  ];

  return (
    <div className="space-y-2">
      {menuItems.map(({ label, value, icon: Icon }) => {
        const isProfile = value === "profile";
        const href = isProfile ? "/mypage/profile" : `/mypage?tab=${value}`;
        const isActive = tab === value && !isProfile;

        return (
          <Button
            key={value}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2.5 h-10 px-3 transition-colors group relative rounded-control",
              isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold before:absolute before:left-0 before:top-2 before:h-6 before:w-[3px] before:rounded-full before:bg-brand-highlight" : "text-foreground hover:bg-muted dark:hover:bg-card",
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
                <Icon className="w-4 h-4" />
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
