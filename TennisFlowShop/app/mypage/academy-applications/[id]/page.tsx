import AcademyApplicationDetailClient from "@/app/mypage/academy-applications/[id]/_components/AcademyApplicationDetailClient";
import AcademyApplicationMypageShell from "@/app/mypage/academy-applications/[id]/_components/AcademyApplicationMypageShell";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "클래스 신청 상세",
};

export default async function AcademyApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    const target = `/mypage/academy-applications/${id}`;
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  const uiUser = {
    id: user.id,
    name: user.name ?? "회원",
    email: user.email ?? "",
    role: user.role,
    oauthProviders: user.oauthProviders,
  };

  return (
    <AcademyApplicationMypageShell user={uiUser}>
      <AcademyApplicationDetailClient id={id} />
    </AcademyApplicationMypageShell>
  );
}
