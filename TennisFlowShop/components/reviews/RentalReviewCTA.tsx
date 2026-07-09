"use client";

import { Button } from "@/components/ui/button";
import { Check, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

type Props = {
  rentalId: string;
  userConfirmedAt?: string | null;
  returnedAt?: string | null;
  status?: string | null;
  className?: string;
};

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

export default function RentalReviewCTA({
  rentalId,
  userConfirmedAt,
  returnedAt,
  status,
  className,
}: Props) {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();
  const allowFetch =
    Boolean(rentalId) ||
    Boolean(userConfirmedAt) ||
    Boolean(returnedAt) ||
    normalizedStatus === "returned" ||
    normalizedStatus === "반납완료";
  const url = rentalId ? `/api/reviews/eligibility?rentalId=${rentalId}` : null;
  const { data, isLoading } = useSWR(allowFetch ? url : null, fetcher);

  if (!allowFetch) return null;
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
        이미 대여 후기를 남겼어요
      </Button>
    );
  }
  if (data?.eligible === false) return null;

  return (
    <Button size="sm" variant="default" className={className} asChild>
      <Link href={`/reviews/write?rentalId=${rentalId}`}>
        <MessageSquarePlus className="mr-1 h-4 w-4" />
        대여 후기 작성
      </Link>
    </Button>
  );
}
