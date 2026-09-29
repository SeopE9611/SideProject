import AdminRentalsClient from "@/app/admin/rentals/_components/AdminRentalsClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대여 관리",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  return <AdminRentalsClient />;
}
