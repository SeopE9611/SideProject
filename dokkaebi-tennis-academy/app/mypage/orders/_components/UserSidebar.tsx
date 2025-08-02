'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarCheck, ClipboardList, Heart, MessageCircleQuestion, Star, UserCog, ChevronRight } from 'lucide-react';

export function UserSidebar() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'orders';

  // 메뉴 항목 정의
  const menuItems = [
    {
      label: '주문 내역',
      value: 'orders',
      icon: ClipboardList,
      gradient: 'from-blue-500 to-purple-500',
      bgGradient: 'from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20',
    },
    {
      label: '신청 내역',
      value: 'applications',
      icon: CalendarCheck,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
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
      icon: Star,
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
      label: '회원 정보 수정',
      value: 'profile',
      icon: UserCog,
      gradient: 'from-gray-500 to-slate-500',
      bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20',
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
              'w-full justify-start gap-3 h-12 px-4 transition-all duration-200 group relative overflow-hidden',
              isActive ? `bg-gradient-to-r ${bgGradient} border border-gray-200 dark:border-gray-700 shadow-sm` : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            )}
            asChild
          >
            <Link href={href} replace={!isProfile}>
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                  isActive ? `bg-gradient-to-r ${gradient} text-white shadow-lg` : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn('font-medium transition-colors duration-200', isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100')}>{label}</span>
              <ChevronRight
                className={cn('w-4 h-4 ml-auto transition-all duration-200', isActive ? 'text-gray-600 dark:text-gray-400 transform translate-x-1' : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400')}
              />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
