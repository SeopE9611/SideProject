import type { Metadata } from "next";

import AcademyClassesClient from "./_components/AcademyClassesClient";

export const metadata: Metadata = {
  title: "아카데미 클래스 관리",
};

export default function AcademyClassesPage() {
  return <AcademyClassesClient />;
}
