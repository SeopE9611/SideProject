import OperationsClient from "@/app/admin/operations/_components/OperationsClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "운영 통합 센터",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  return <OperationsClient />;
}
