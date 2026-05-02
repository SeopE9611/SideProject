"use client";

import { LogIn, Shield, ShoppingCart, Star, Ticket, Truck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export type LoginGateVariant = "packages" | "checkout" | "orderLookup" | "default";

type Perk = {
  icon: React.ReactNode;
  text: string;
};

function variantCopy(variant: LoginGateVariant) {
  if (variant === "packages") {
    return {
      minHeight: "min-h-[60vh]",
      description: (
        <>
          패키지 상품은 <span className="font-medium">회원 전용 서비스</span>
          입니다.
        </>
      ),
      perks: [
        {
          icon: <Ticket className="h-4 w-4 text-primary" />,
          text: "패키지 잔여 횟수 관리",
        },
        {
          icon: <Shield className="h-4 w-4 text-primary" />,
          text: "안전한 주문 조회",
        },
        {
          icon: <Star className="h-4 w-4 text-primary" />,
          text: "멤버 전용 혜택",
        },
      ] satisfies Perk[],
      secondary: { href: "/services/packages", label: "패키지 둘러보기" },
    };
  }

  if (variant === "checkout") {
    return {
      minHeight: "min-h-[100svh]",
      description: <>주문을 진행하려면 로그인 후 다시 시도해주세요.</>,
      perks: [
        {
          icon: <ShoppingCart className="h-4 w-4 text-primary" />,
          text: "주문/구매 내역 관리",
        },
        {
          icon: <Truck className="h-4 w-4 text-primary" />,
          text: "배송/수령 상태 확인",
        },
        {
          icon: <Shield className="h-4 w-4 text-primary" />,
          text: "안전한 결제/보안",
        },
      ] satisfies Perk[],
      secondary: { href: "/", label: "홈으로" },
    };
  }

  if (variant === "orderLookup") {
    return {
      minHeight: "min-h-[60vh]",
      description: (
        <>
          현재 <span className="font-medium">비회원 주문 조회</span>는 중단되었습니다.
          <br />
          로그인 후 <span className="font-medium">마이페이지</span>에서 주문내역을 확인해주세요.
        </>
      ),
      perks: [
        {
          icon: <ShoppingCart className="h-4 w-4 text-primary" />,
          text: "주문/구매 내역 확인",
        },
        {
          icon: <Truck className="h-4 w-4 text-primary" />,
          text: "배송/수령 상태 확인",
        },
        {
          icon: <Shield className="h-4 w-4 text-primary" />,
          text: "보안 인증 기반 조회",
        },
      ] satisfies Perk[],
      secondary: { href: "/", label: "홈으로" },
    };
  }

  return {
    minHeight: "min-h-[60vh]",
    description: <>해당 기능을 이용하려면 로그인 해주세요.</>,
    perks: [
      {
        icon: <Shield className="h-4 w-4 text-primary" />,
        text: "안전한 계정 보호",
      },
      {
        icon: <Star className="h-4 w-4 text-primary" />,
        text: "멤버 전용 혜택",
      },
      {
        icon: <Ticket className="h-4 w-4 text-primary" />,
        text: "회원 전용 서비스",
      },
    ] satisfies Perk[],
    secondary: { href: "/", label: "홈으로" },
  };
}

export default function LoginGate({ next, variant = "default" }: { next: string; variant?: LoginGateVariant }) {
  const v = variantCopy(variant);
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className={`${v.minHeight} bg-background`}>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="relative overflow-hidden border-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] bg-card/90 dark:bg-card/85">
            <div className="h-1.5 w-full bg-primary" />

            <CardContent className="p-8">
              <div className="w-14 h-14 rounded-2xl border border-primary/20 bg-primary/10 dark:bg-primary/20 text-primary grid place-content-center shadow-lg mb-6">
                <LogIn className="h-7 w-7" />
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-normal mb-2">
                <span className="text-primary">로그인</span>이 필요합니다.
              </h1>
              <p className="text-muted-foreground">{v.description}</p>

              <div className="mt-4">
                <Badge variant="highlight">로그인 후 원래 페이지로 자동 복귀</Badge>
              </div>
            </CardContent>

            <CardFooter className="px-8 pb-8">
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="default">
                  <Link href={loginHref}>로그인·회원가입하기</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={v.secondary.href}>{v.secondary.label}</Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
