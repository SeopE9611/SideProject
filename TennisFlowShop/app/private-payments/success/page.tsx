import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { privatePayments } from "@/lib/private-payments";
import { formatKoreanDateTime } from "@/lib/korean-date";
import { PublicPageHero, ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";
import { getCommonPaymentStatusLabel } from "@/lib/status-labels/base";
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
      <main className="min-h-screen bg-background pb-10">
        <PublicPageHero
          variant="feature"
          eyebrow="개인결제"
          title="결제 결과를 확인해 주세요"
          description="개인결제 승인 내역을 안전하게 확인할 수 있습니다."
        />
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <ResultState
            status="error"
            title="결제 내역을 찾을 수 없습니다."
            description="결제 정보가 누락되었습니다. 관리자에게 문의해 주세요."
          >
            <Button asChild variant="outline" className="w-full rounded-control sm:w-auto">
              <Link href="/">홈으로 이동</Link>
            </Button>
          </ResultState>
        </div>
      </main>
    );
  if (!item)
    return (
      <main className="min-h-screen bg-background pb-10">
        <PublicPageHero
          variant="feature"
          eyebrow="개인결제"
          title="결제 결과를 확인해 주세요"
          description="개인결제 승인 내역을 안전하게 확인할 수 있습니다."
        />
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <ResultState
            status="error"
            title="결제 내역을 찾을 수 없습니다."
            description="개인결제 정보를 확인할 수 없습니다. 관리자에게 문의해 주세요."
          >
            <Button asChild variant="outline" className="w-full rounded-control sm:w-auto">
              <Link href="/">홈으로 이동</Link>
            </Button>
          </ResultState>
        </div>
      </main>
    );
  const paymentStatusLabel =
    getCommonPaymentStatusLabel(item.paymentStatus) ?? item.paymentStatus ?? "-";
  return (
    <main className="min-h-screen bg-background pb-10">
      <PublicPageHero
        variant="feature"
        eyebrow="개인결제"
        title="결제가 완료되었습니다"
        description="개인결제 승인 내역을 확인해 주세요."
      />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <ResultState
          status="success"
          title="결제가 완료되었습니다."
          description="개인결제 승인 내역을 확인해 주세요."
        >
          <div className="w-full space-y-3 rounded-control border border-border bg-muted/40 p-4 text-left text-ui-body-sm sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">결제명</span>
              <span className="min-w-0 break-words text-right font-medium">{item.title || "-"}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">결제금액</span>
              <span className="min-w-0 break-words text-right font-semibold text-brand-highlight-ink">
                {item.amount?.toLocaleString("ko-KR") || "0"}원
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">결제상태</span>
              <span className="min-w-0 break-words text-right font-medium text-success">
                {paymentStatusLabel}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">결제일</span>
              <span className="min-w-0 break-words text-right">
                {formatKoreanDateTime(item.paidAt)}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full rounded-control sm:w-auto">
            <Link href="/">홈으로 이동</Link>
          </Button>
        </ResultState>
      </div>
    </main>
  );
}
