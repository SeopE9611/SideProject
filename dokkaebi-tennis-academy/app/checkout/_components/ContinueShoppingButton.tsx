'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface ContinueShoppingButtonProps {
  deliveryMethod?: '택배수령' | '방문수령';
  withStringService?: boolean;
}

export default function ContinueShoppingButton({ deliveryMethod, withStringService }: ContinueShoppingButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (deliveryMethod === '방문수령' && withStringService) {
      const proceed = window.confirm('스트링 장착 서비스 신청서를 작성하지 않았습니다.\n계속 쇼핑하시겠습니까?\n\n(이 창을 벗어나도 마이페이지 > 주문 내역에서 이어서 신청할 수 있습니다.)');
      if (!proceed) return;
    }

    router.push('/products');
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className="w-full h-12 border-2 border-border dark:border-border hover:bg-primary hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 hover:border-border dark:hover:border-border transition-all duration-300 group bg-transparent"
    >
      <ShoppingBag className="h-4 w-4 mr-2 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
      쇼핑 계속하기
      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
    </Button>
  );
}
