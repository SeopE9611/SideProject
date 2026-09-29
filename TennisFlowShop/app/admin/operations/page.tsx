import OperationsClient from "@/app/admin/operations/_components/OperationsClient";
import { isPortfolioDemo } from "@/lib/portfolio-demo/interactive.server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "운영 업무",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  return <OperationsClient portfolioDemo={isPortfolioDemo()} />;
}
