import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 신청 내역",
};

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  const target = "/mypage?tab=orders&scope=application";

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  redirect(target);
}
