import { ArrowRight, CheckCircle2, Clock, FileText, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface, ResultState, SummaryCard } from "@/components/public";
import { Button } from "@/components/ui/button";

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
    <main className="min-h-screen bg-background">
      <SiteContainer className="max-w-3xl py-10 bp-sm:py-14 md:py-16">
        <div className="space-y-5 sm:space-y-6">
          <ResultState
            status="success"
            title="아카데미 신청이 완료되었습니다"
            icon={<CheckCircle2 className="size-7" aria-hidden="true" />}
            description={
              <div className="space-y-2">
                <p className="text-ui-body-sm font-medium text-primary">도깨비테니스 아카데미</p>
                <p className="text-pretty leading-relaxed">
                  신청 내용이 접수되었습니다. 담당자가 일정과 수강 방식을 확인한 뒤 상담을
                  도와드립니다.
                </p>
              </div>
            }
            actions={
              <>
                <Button asChild size="lg" wrap="responsive" className="h-12 px-6">
                  <Link href="/mypage?tab=academy">
                    마이페이지에서 확인하기
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" wrap="responsive" className="h-12 px-6">
                  <Link href="/academy">아카데미로 돌아가기</Link>
                </Button>
              </>
            }
            className="max-w-none rounded-2xl border border-border bg-card px-6 py-8 shadow-sm sm:px-8 sm:py-10"
          />

          {receiptLabel && (
            <SummaryCard
              title="신청 정보"
              description="접수된 신청의 기본 정보를 확인하세요."
              contentClassName="p-0"
            >
              <dl className="divide-y divide-border">
                <div className="grid gap-1 px-5 py-4 sm:grid-cols-[120px_1fr] sm:gap-4 sm:px-6">
                  <dt className="flex items-center gap-2 text-ui-body-sm font-medium text-muted-foreground">
                    <FileText className="size-4" aria-hidden="true" />
                    접수번호
                  </dt>
                  <dd className="min-w-0 break-words font-mono text-ui-body-sm font-semibold tabular-nums text-foreground">
                    {receiptLabel}
                  </dd>
                </div>
              </dl>
            </SummaryCard>
          )}

          <SummaryCard
            title={
              <span className="flex items-center gap-2">
                <Clock className="size-5 text-primary" aria-hidden="true" />
                다음 단계 안내
              </span>
            }
            description="신청 이후 진행 상황은 마이페이지에서 확인할 수 있습니다."
          >
            <PublicSurface
              variant="muted"
              padding="sm"
              className="text-ui-body-sm leading-relaxed text-muted-foreground"
            >
              관리자가 신청 내용을 확인한 뒤 등록 확정 여부를 안내합니다. 신청 단계에서는 결제가
              진행되지 않으며, 등록 확정 후 현장에서 결제를 안내해드립니다.
            </PublicSurface>
          </SummaryCard>

          <PublicSurface variant="muted">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-ui-body-lg font-semibold text-foreground">
                  추가 문의가 필요하신가요?
                </h2>
                <p className="mt-1 text-ui-body-sm leading-relaxed text-muted-foreground">
                  신청 내용과 관련해 궁금한 점이 있다면 문의글을 남겨주세요.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="lg"
                wrap="responsive"
                className="h-12 shrink-0 px-6"
              >
                <Link href="/board/qna/write?category=academy">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  문의글 작성하기
                </Link>
              </Button>
            </div>
          </PublicSurface>
        </div>
      </SiteContainer>
    </main>
  );
}
