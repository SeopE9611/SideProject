import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "패키지권 상세",
};

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const target = `/mypage?tab=passes&packageOrderId=${encodeURIComponent(id)}`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  redirect(target);
}
