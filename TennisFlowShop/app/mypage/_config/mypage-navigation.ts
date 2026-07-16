import {
  ClipboardList,
  GraduationCap,
  Heart,
  MessageCircleQuestion,
  MessageSquare,
  ReceiptCent,
  Ticket,
  UserCog,
} from "lucide-react";

export const MYPAGE_NAV_ITEMS = [
  { value: "orders", label: "거래/이용 내역", shortLabel: "거래/이용", icon: ClipboardList },
  { value: "academy", label: "클래스 신청", shortLabel: "클래스", icon: GraduationCap },
  { value: "wishlist", label: "찜한 상품", shortLabel: "찜", icon: Heart },
  { value: "reviews", label: "리뷰 관리", shortLabel: "리뷰", icon: MessageSquare },
  { value: "qna", label: "문의 내역", shortLabel: "문의", icon: MessageCircleQuestion },
  { value: "passes", label: "패키지권", shortLabel: "패키지", icon: Ticket },
  { value: "points", label: "적립 포인트", shortLabel: "포인트", icon: ReceiptCent },
] as const;

export const MYPAGE_PROFILE_NAV_ITEM = {
  value: "profile",
  label: "회원 정보 수정",
  shortLabel: "회원정보",
  icon: UserCog,
} as const;
