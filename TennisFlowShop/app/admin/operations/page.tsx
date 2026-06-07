import OperationsClient from "@/app/admin/operations/_components/OperationsClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "오늘 처리함",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  return <OperationsClient />;
}
