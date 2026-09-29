import MessagesClient from "@/app/messages/MessagesClient";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "쪽지함",
};

export default async function MessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    const target = "/messages";
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  return <MessagesClient user={user} />;
}
