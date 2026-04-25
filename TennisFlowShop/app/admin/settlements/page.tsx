import SettlementsClient from "@/app/admin/settlements/_components/SettlementsClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "정산 관리",
};

export const dynamic = "force-dynamic"; // 최신 스냅샷 보려고(SSG 비활성)
export default function Page() {
  return <SettlementsClient />;
}
