"use client";

import StringingApplicationDetailClient from "@/app/features/stringing-applications/components/StringingApplicationDetailClient";

type Props = {
  id: string;
  backUrl?: string;
};

export default function ApplicationDetail({ id, backUrl = "/mypage?tab=orders" }: Props) {
  return (
    <StringingApplicationDetailClient
      id={id}
      baseUrl={process.env.NEXT_PUBLIC_API_URL || ""}
      /** 뒤로 가기 경로 기본값: 주문/이용 허브 */
      backUrl={backUrl}
      /** 일반 사용자 모드 */
      isAdmin={false}
      userEditableStatuses={["검토 중", "접수완료"]}
    />
  );
}
