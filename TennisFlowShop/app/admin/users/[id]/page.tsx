import UserDetailClient from "@/app/admin/users/_components/UserDetailClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원 상세",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container py-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <UserDetailClient id={id} />
      </div>
    </div>
  );
}
