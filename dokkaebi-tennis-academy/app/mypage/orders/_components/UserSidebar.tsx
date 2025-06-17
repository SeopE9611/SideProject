'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarCheck, ClipboardList, Heart, MessageCircleQuestion, Star, UserCog } from 'lucide-react';

export function UserSidebar() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'orders';

  // 메뉴 항목 정의
  const menuItems = [
    { label: '주문 내역', value: 'orders', icon: ClipboardList },
    { label: '신청 내역', value: 'applications', icon: CalendarCheck },
    { label: '위시리스트', value: 'wishlist', icon: Heart },
    { label: '리뷰 관리', value: 'reviews', icon: Star },
    { label: 'Q&A 내역', value: 'qna', icon: MessageCircleQuestion },
    { label: '회원 정보 수정', value: 'profile', icon: UserCog },
  ];

  return (
    <div className="space-y-2">
      {menuItems.map(({ label, value, icon: Icon }) => {
        const isProfile = value === 'profile';
        const href = isProfile ? '/mypage/profile' : `/mypage?tab=${value}`;

        return (
          <Button
            key={value}
            variant={tab === value && !isProfile ? 'secondary' : 'ghost'}
            className={cn('w-full justify-start gap-2', {
              'font-semibold': tab === value && !isProfile,
            })}
            asChild
          >
            <Link href={href} replace={!isProfile}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
