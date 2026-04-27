import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "클래스 등록",
};

export default function AdminNewClassPage() {
  redirect("/admin/dashboard");
}
