"use client";

import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Check, MessageSquarePlus } from "lucide-react";

type Props = {
  applicationId?: string;
  status?: string;
  userConfirmedAt?: string | null;
  className?: string;
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function ServiceReviewCTA({
  applicationId,
  status,
  userConfirmedAt,
  className,
}: Props) {
  void status;
  // 서비스 리뷰는 사용자 확정 이후에만 허용
  const allowFetchByConfirmation = applicationId
    ? Boolean(userConfirmedAt)
    : true;

  // applicationId 유무에 따라 eligibility URL 분기
  const url = applicationId
    ? `/api/reviews/eligibility?service=stringing&applicationId=${applicationId}`
    : `/api/reviews/eligibility?service=stringing`;

  const { data, isLoading } = useSWR(
    allowFetchByConfirmation ? url : null,
    fetcher,
  );

  if (!allowFetchByConfirmation) return null;
  if (isLoading) {
    return (
      <Button size="sm" variant="outline" className={className} disabled>
        확인중…
      </Button>
    );
  }
  if (data?.reason === "already") {
    return (
      <Button size="sm" variant="secondary" className={className} disabled>
        <Check className="mr-1 h-4 w-4" />
        이미 교체서비스 후기를 남겼어요
      </Button>
    );
  }
  if (data?.eligible === false) return null;

  // 링크 만들기: applicationId 우선, 없으면 추천 ID 사용
  const href =
    `/reviews/write?service=stringing` +
    (applicationId
      ? `&applicationId=${applicationId}`
      : data?.suggestedApplicationId
        ? `&applicationId=${data.suggestedApplicationId}`
        : "");

  return (
    <Button size="sm" variant="default" className={className} asChild>
      <Link href={href}>
        <MessageSquarePlus className="mr-1 h-4 w-4" />
        교체서비스 후기 작성하기
      </Link>
    </Button>
  );
}
