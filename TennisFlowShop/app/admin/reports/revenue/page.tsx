import type { Metadata } from "next";
import RevenueReportClient from "./_components/RevenueReportClient";

export const metadata: Metadata = { title: "온라인/오프라인 매출 리포트" };
export const dynamic = "force-dynamic";

export default function RevenueReportPage() {
  return <RevenueReportClient />;
}
