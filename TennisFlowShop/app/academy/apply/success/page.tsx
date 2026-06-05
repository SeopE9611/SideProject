import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

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
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <div className="flex flex-col items-center text-center">
            {/* Success Icon */}
            <div className="relative mb-8">
              <div
                className="absolute inset-0 animate-ping rounded-full bg-primary/20"
                style={{ animationDuration: "2s" }}
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
            </div>

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              도깨비테니스 아카데미
            </div>

            {/* Title */}
            <h1 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              레슨 신청이 접수되었습니다
            </h1>

            <p className="mb-8 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              신청 내용이 접수되었습니다. 담당자가 일정과 수강 방식을 확인한 뒤
              상담을 도와드립니다.
            </p>

            {/* Receipt Number */}
            {receiptLabel && (
              <div className="mb-8 inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card px-5 py-3 shadow-sm">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">접수번호</p>
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {receiptLabel}
                  </p>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 gap-2 px-6">
                <Link href="/mypage?tab=academy">
                  마이페이지에서 확인하기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 gap-2 px-6"
              >
                <Link href="/board/qna/write?category=academy">
                  <MessageCircle className="h-4 w-4" />
                  문의글 작성하기
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="p-6 md:p-8">
            <h2 className="mb-6 flex items-center gap-3 text-lg font-semibold text-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              다음 단계 안내
            </h2>

            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "신청 내용 확인",
                  description:
                    "관리자가 신청 내용을 확인한 뒤 등록 확정 여부를 안내합니다.",
                },
                {
                  step: 2,
                  title: "상태 확인",
                  description:
                    "진행 상태는 마이페이지의 아카데미 신청 내역에서 확인할 수 있습니다.",
                },
                {
                  step: 3,
                  title: "결제 안내",
                  description:
                    "신청 단계에서는 결제가 진행되지 않으며, 등록 확정 후 현장에서 결제를 안내해드립니다.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group flex gap-4 rounded-xl border border-border/40 bg-muted/30 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary transition-colors group-hover:bg-primary/15">
                    {item.step}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
