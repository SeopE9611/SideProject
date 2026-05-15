import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "레슨 신청 접수 완료 | 도깨비테니스 아카데미",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getReceiptLabel(applicationId?: string) {
  if (!applicationId) return null;
  if (applicationId.length <= 12) return applicationId;
  return `${applicationId.slice(0, 6)}...${applicationId.slice(-6)}`;
}

export default async function AcademyApplySuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawApplicationId = Array.isArray(params.applicationId)
    ? params.applicationId[0]
    : params.applicationId;
  const receiptLabel = getReceiptLabel(rawApplicationId);

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto max-w-2xl">
        <Card className="border-border bg-card text-center">
          <CardContent className="space-y-6 p-6 md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle className="h-9 w-9" aria-hidden="true" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-success">
                도깨비테니스 아카데미
              </p>
              <h1 className="break-keep text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                레슨 신청이 접수되었습니다
              </h1>
              <div className="space-y-2 break-keep text-sm leading-6 text-muted-foreground md:text-base">
                <p>신청 내용이 접수되었습니다.</p>
                <p>담당자가 일정과 수강 방식을 확인한 뒤 상담을 도와드립니다.</p>
                <p>등록이 확정되면 현장에서 결제를 안내해드립니다.</p>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-left text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">다음 행동 안내</p>
              <ul className="mt-2 space-y-1">
                <li>• 관리자가 신청 내용을 확인한 뒤 등록 확정 여부를 안내합니다.</li>
                <li>• 상태는 마이페이지의 아카데미 신청 내역에서 확인할 수 있습니다.</li>
                <li>• 신청 단계에서는 결제가 진행되지 않습니다.</li>
              </ul>
            </div>

            {receiptLabel ? (
              <div className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground">
                접수번호: <span className="font-semibold">{receiptLabel}</span>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/mypage?tab=academy">마이페이지에서 확인하기</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/board/qna/write?category=academy">
                  문의글 작성하기
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
