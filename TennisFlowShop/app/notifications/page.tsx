import NotificationsClient from "@/app/notifications/NotificationsClient";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "알림",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    const target = "/notifications";
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  return <NotificationsClient />;
}
