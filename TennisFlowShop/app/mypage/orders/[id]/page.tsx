import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "주문 상세",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const target = `/mypage?tab=orders&flowType=order&flowId=${encodeURIComponent(id)}&from=orders`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  redirect(target);
}
