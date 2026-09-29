import AdminRacketsClient from "@/app/admin/rackets/_components/AdminRacketsClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라켓 관리",
};

export const dynamic = "force-dynamic";
export default function Page() {
  return <AdminRacketsClient />;
}
