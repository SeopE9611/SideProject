import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "커뮤니티 신고 관리",
};

export default function AdminCommunityReportsPage() {
  redirect("/admin/boards?tab=reports");
}
