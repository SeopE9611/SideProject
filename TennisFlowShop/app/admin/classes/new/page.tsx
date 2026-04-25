import NewClassClient from "@/app/admin/classes/new/NewClassClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "클래스 등록",
};

export default async function NewClassPage() {
  return <NewClassClient />;
}
