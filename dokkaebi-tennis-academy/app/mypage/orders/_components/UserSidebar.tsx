'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarCheck, ClipboardList, Heart, MessageCircleQuestion, Star, UserCog, ChevronRight, Ticket, MessageSquare, RectangleGoggles, Handshake, Signature, Briefcase, ReceiptCent } from 'lucide-react';

export function UserSidebar() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'orders';

  // 메뉴 항목 정의
  const menuItems = [
    {
      label: '주문 내역',
      value: 'orders',
      icon: ClipboardList,
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20',
    },
    {
      label: '신청 내역',
      value: 'applications',
      icon: CalendarCheck,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
    },
    {
      label: '대여 내역',
      value: 'rentals',
      icon: Briefcase,
      gradient: 'from-blue-500 to-blue-500',
      bgGradient: 'from-blue-50 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/20',
    },
    {
      label: '위시리스트',
      value: 'wishlist',
      icon: Heart,
      gradient: 'from-pink-500 to-rose-500',
      bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20',
    },
    {
      label: '리뷰 관리',
      value: 'reviews',
      icon: MessageSquare,
      gradient: 'from-yellow-500 to-orange-500',
      bgGradient: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
    },
    {
      label: 'Q&A 내역',
      value: 'qna',
      icon: MessageCircleQuestion,
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20',
    },
    {
      label: '패키지',
      value: 'passes',
      icon: Ticket,
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20',
    },
    {
      label: '적립 포인트',
      value: 'points',
      icon: ReceiptCent,
      gradient: 'from-amber-500 to-yellow-500',
      bgGradient: 'from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20',
    },
    {
      label: '회원 정보 수정',
      value: 'profile',
      icon: UserCog,
      gradient: 'from-slate-500 to-gray-500',
      bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20',
    },
  ];

  return (
    <div className="space-y-2">
      {menuItems.map(({ label, value, icon: Icon, gradient, bgGradient }) => {
        const isProfile = value === 'profile';
        const href = isProfile ? '/mypage/profile' : `/mypage?tab=${value}`;
        const isActive = tab === value && !isProfile;

        return (
          <Button
            key={value}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-12 px-4 transition-all duration-300 group relative overflow-hidden rounded-xl',
              isActive ? `bg-gradient-to-r ${bgGradient} border border-transparent shadow-md ring-1 ring-slate-900/6 dark:ring-white/10` : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
            )}
            asChild
          >
            <Link href={href} replace={!isProfile}>
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 shadow-sm',
                  isActive ? `bg-gradient-to-r ${gradient} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn('font-medium transition-colors duration-300', isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100')}>{label}</span>
              <ChevronRight
                className={cn('w-4 h-4 ml-auto transition-all duration-300', isActive ? 'text-slate-600 dark:text-slate-400 transform translate-x-1' : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400')}
              />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
