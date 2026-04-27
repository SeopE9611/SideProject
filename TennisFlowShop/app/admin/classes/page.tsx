import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "클래스 관리",
};

export default function AdminClassesPage() {
  redirect("/admin/dashboard");
}
