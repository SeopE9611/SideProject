import type { Metadata } from "next";

import AcademyClassEditClient from "./_components/AcademyClassEditClient";

export const metadata: Metadata = {
  title: "클래스 수정",
};

export default async function AcademyClassEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AcademyClassEditClient id={id} />;
}
