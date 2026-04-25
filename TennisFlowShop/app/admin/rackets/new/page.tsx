import AdminRacketNewClient from "@/app/admin/rackets/new/_components/AdminRacketNewClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "중고 라켓 등록",
};

export const dynamic = "force-dynamic";
export default function Page() {
  return <AdminRacketNewClient />;
}
