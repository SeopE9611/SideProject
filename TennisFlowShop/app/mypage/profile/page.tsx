import ProfileClient from "@/app/mypage/profile/_components/ProfileClient";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원 정보",
};

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    const target = "/mypage/profile";
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name ?? "회원",
        email: user.email ?? "",
        role: user.role,
      }}
    />
  );
}
