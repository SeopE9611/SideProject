import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리뷰 상세",
};

export default function AdminReviewDetailPage() {
  redirect("/admin/reviews");
}
