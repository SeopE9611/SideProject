import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 신청 상세",
};

interface Props {
  params: Promise<{ id: string }>;
}
export default async function ApplicationDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  const { id } = await params;
  const target = `/mypage?tab=orders&flowType=application&flowId=${encodeURIComponent(id)}&from=orders`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  redirect(target);
}
