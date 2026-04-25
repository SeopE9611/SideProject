import ClassesPage from "@/app/admin/classes/ClassesClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "클래스 관리",
};

export default async function Page() {
  return <ClassesPage />;
}
