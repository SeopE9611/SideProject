'use client';

import { useRouter } from 'next/navigation';

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
    <button className="w-full border border-gray-300 py-2 rounded-md text-sm hover:bg-gray-100" onClick={handleClick}>
      쇼핑 계속하기
    </button>
  );
}
