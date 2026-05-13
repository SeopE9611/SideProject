import type { Metadata } from "next";

import AcademyClassDetailClient from "./_components/AcademyClassDetailClient";

export const metadata: Metadata = {
  title: "클래스 상세",
};

export default async function AcademyClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AcademyClassDetailClient id={id} />;
}
