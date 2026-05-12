import type { Metadata } from "next";

import AcademyApplicationsClient from "./_components/AcademyApplicationsClient";

export const metadata: Metadata = {
  title: "아카데미 신청 관리",
};

export default function AcademyApplicationsPage() {
  return <AcademyApplicationsClient />;
}
