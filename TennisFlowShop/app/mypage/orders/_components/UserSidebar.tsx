'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarCheck, ClipboardList, Heart, MessageCircleQuestion, Star, UserCog, ChevronRight, Ticket, MessageSquare, RectangleGoggles, Handshake, Signature, Briefcase, ReceiptCent, Layers } from 'lucide-react';

export function UserSidebar() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'orders';

  // 메뉴 항목 정의
  const menuItems = [
    {
      label: '전체 내역 보기',
      value: 'activity',
      icon: Layers,
      
    },
    {
      label: '주문 내역',
      value: 'orders',
      icon: ClipboardList,
      
    },
    {
      label: '신청 내역',
      value: 'applications',
      icon: CalendarCheck,
      
    },
    {
      label: '대여 내역',
      value: 'rentals',
      icon: Briefcase,
      
    },
    {
      label: '위시리스트',
      value: 'wishlist',
      icon: Heart,
      
    },
    {
      label: '리뷰 관리',
      value: 'reviews',
      icon: MessageSquare,
      
    },
    {
      label: 'Q&A 내역',
      value: 'qna',
      icon: MessageCircleQuestion,
      
    },
    {
      label: '패키지',
      value: 'passes',
      icon: Ticket,
      
    },
    {
      label: '적립 포인트',
      value: 'points',
      icon: ReceiptCent,
      
    },
    {
      label: '회원 정보 수정',
      value: 'profile',
      icon: UserCog,
      
    },
  ];

  return (
    <div className="space-y-2">
      {menuItems.map(({ label, value, icon: Icon }) => {
        const isProfile = value === 'profile';
        const href = isProfile ? '/mypage/profile' : `/mypage?tab=${value}`;
        const isActive = tab === value && !isProfile;

        return (
          <Button
            key={value}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-12 px-4 transition-all duration-300 group relative overflow-hidden rounded-xl',
              isActive ? 'bg-primary/10 dark:bg-primary/20 border border-primary/20 ring-1 ring-ring/30 shadow-md' : 'hover:bg-muted dark:hover:bg-card'
            )}
            asChild
          >
            <Link href={href} replace={!isProfile}>
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 shadow-sm',
                  isActive ? 'border border-primary/20 bg-primary/10 dark:bg-primary/20 text-primary shadow-lg' : 'bg-muted text-muted-foreground group-hover:bg-muted/80 dark:group-hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn('font-medium transition-colors duration-300', isActive ? 'text-foreground' : 'text-foreground group-hover:text-foreground dark:group-hover:text-muted-foreground')}>{label}</span>
              <ChevronRight
                className={cn('w-4 h-4 ml-auto transition-all duration-300', isActive ? 'text-muted-foreground transform translate-x-1' : 'text-muted-foreground group-hover:text-muted-foreground dark:group-hover:text-muted-foreground')}
              />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
