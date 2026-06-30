import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { privatePayments } from "@/lib/private-payments";
import { formatKoreanDateTime } from "@/lib/korean-date";
import { ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function PrivatePaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;
  const item =
    paymentId && ObjectId.isValid(paymentId)
      ? await privatePayments((await clientPromise).db()).findOne({ _id: new ObjectId(paymentId) })
      : null;
  if (!paymentId)
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <ResultState
          title="결제 내역을 찾을 수 없습니다."
          description="결제 정보가 누락되었습니다. 관리자에게 문의해 주세요."
        >
          <Button asChild>
            <Link href="/">홈으로 이동</Link>
          </Button>
        </ResultState>
      </main>
    );
  if (!item)
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <ResultState
          title="결제 내역을 찾을 수 없습니다."
          description="개인결제 정보를 확인할 수 없습니다. 관리자에게 문의해 주세요."
        >
          <Button asChild>
            <Link href="/">홈으로 이동</Link>
          </Button>
        </ResultState>
      </main>
    );
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <ResultState title="결제가 완료되었습니다." description="개인결제 승인 내역을 확인해 주세요.">
        <div className="w-full space-y-3 rounded-lg border bg-background p-4 text-left text-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">결제명</span>
            <span className="text-right font-medium">{item.title || "-"}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">결제금액</span>
            <span className="text-right font-semibold">
              {item.amount?.toLocaleString("ko-KR") || "0"}원
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">결제상태</span>
            <span className="text-right font-medium">{item.paymentStatus || "-"}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">결제일</span>
            <span className="text-right">{formatKoreanDateTime(item.paidAt)}</span>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/">홈으로 이동</Link>
        </Button>
      </ResultState>
    </main>
  );
}
