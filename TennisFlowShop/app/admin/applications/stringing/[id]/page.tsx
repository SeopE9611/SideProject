import StringingApplicationDetailClient from "@/app/features/stringing-applications/components/StringingApplicationDetailClient";
import { isPortfolioDemoReadOnly } from "@/lib/admin/portfolio-demo-readonly.server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 신청 상세",
};

type StringingDetailPageProps = {
  params: Promise<{ id: string }>;
};
export default async function StringingApplicationDetailPage({ params }: StringingDetailPageProps) {
  const { id } = await params;

  return (
    <StringingApplicationDetailClient id={id} isAdmin={true} readOnly={isPortfolioDemoReadOnly()} />
  );
}
