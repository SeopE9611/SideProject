import type { Metadata } from "next";

import AcademyApplicationDetailClient from "./_components/AcademyApplicationDetailClient";

export const metadata: Metadata = {
  title: "레슨 신청 상세",
};

type AcademyApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AcademyApplicationDetailPage({
  params,
}: AcademyApplicationDetailPageProps) {
  const { id } = await params;
  return <AcademyApplicationDetailClient id={id} />;
}
