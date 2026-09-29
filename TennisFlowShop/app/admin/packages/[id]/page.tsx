import PackageDetailClient from "./PackageDetailClient";
import { isPortfolioDemoReadOnly } from "@/lib/admin/portfolio-demo-readonly.server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "패키지 상세",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PackageDetailPage({ params }: Props) {
  const { id } = await params;
  return <PackageDetailClient packageId={id} readOnly={isPortfolioDemoReadOnly()} />;
}
