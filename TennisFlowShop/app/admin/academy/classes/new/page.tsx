import type { Metadata } from "next";

import AcademyClassFormClient from "./_components/AcademyClassFormClient";

export const metadata: Metadata = {
  title: "새 클래스 등록",
};

export default function NewAcademyClassPage() {
  return <AcademyClassFormClient mode="create" />;
}
