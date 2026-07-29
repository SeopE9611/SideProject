"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight } from "lucide-react";

interface ContinueShoppingButtonProps {
  deliveryMethod?: "택배수령" | "방문수령";
  withStringService?: boolean;
}

export default function ContinueShoppingButton({
  deliveryMethod,
  withStringService,
}: ContinueShoppingButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (deliveryMethod === "방문수령" && withStringService) {
      const proceed = window.confirm(
        "교체서비스 신청서를 작성하지 않았습니다.\n계속 쇼핑하시겠습니까?\n\n(이 창을 벗어나도 마이페이지 > 주문 내역에서 이어서 신청할 수 있습니다.)",
      );
      if (!proceed) return;
    }

    router.push("/products");
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="lg"
      wrap="responsive"
      className="group w-full"
    >
      <ShoppingBag className="h-4 w-4" />
      쇼핑 계속하기
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Button>
  );
}
