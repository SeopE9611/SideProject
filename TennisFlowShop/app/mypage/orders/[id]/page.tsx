import { UserSidebar } from "@/app/mypage/orders/_components/UserSidebar";
import OrderDetailClient from "@/app/mypage/orders/_components/OrderDetailClient";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "주문 상세",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    const target = `/mypage/orders/${id}`;
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }
  return (
    <div className="container py-6 bp-sm:py-8">
      <h1 className="mb-6 text-2xl font-bold bp-sm:mb-8 bp-sm:text-3xl">
        마이페이지
      </h1>
      <div className="grid grid-cols-1 gap-6 bp-sm:gap-8 md:grid-cols-4">
        {/* 사이드바 */}
        <div className="md:col-span-1">
          <UserSidebar />
        </div>

        <div className="md:col-span-3">
          <OrderDetailClient orderId={id} />
        </div>
      </div>
    </div>
  );
}
