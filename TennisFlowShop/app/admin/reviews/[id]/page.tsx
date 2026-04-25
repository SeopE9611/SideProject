import ReviewDetailClient from "@/app/admin/reviews/[id]/ReviewDetailClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리뷰 상세",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params;
  return <ReviewDetailClient reviewId={id} />;
}
