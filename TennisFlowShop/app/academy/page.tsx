import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "도깨비테니스 아카데미",
};

const lessonPrograms = [
  {
    title: "입문 레슨",
    description:
      "라켓을 처음 잡는 분도 기본 자세와 안전한 스윙부터 차근차근 시작할 수 있습니다.",
  },
  {
    title: "성인 취미반",
    description:
      "운동 습관과 즐거운 랠리를 목표로 개인 수준에 맞춰 꾸준히 실력을 쌓습니다.",
  },
  {
    title: "주니어 레슨",
    description:
      "성장기 학생에게 필요한 기초 체력, 코디네이션, 테니스 기본기를 함께 지도합니다.",
  },
  {
    title: "원포인트 레슨",
    description:
      "서브, 스트로크, 경기 운영처럼 특정 고민을 집중 점검하고 개선 방향을 안내합니다.",
  },
];

const lessonFlow = ["문의 접수", "레벨/목표 확인", "일정 상담", "수업 시작"];

const faqs = [
  {
    question: "테니스를 처음 배워도 가능한가요?",
    answer:
      "가능합니다. 입문자는 그립, 준비 자세, 기본 스윙처럼 꼭 필요한 기초부터 안내합니다.",
  },
  {
    question: "라켓이 없어도 상담할 수 있나요?",
    answer:
      "네. 보유 장비가 없어도 문의할 수 있으며, 필요한 준비물은 상담 과정에서 함께 안내합니다.",
  },
  {
    question: "개인 레슨과 그룹 레슨은 어떻게 다른가요?",
    answer:
      "개인 레슨은 맞춤 피드백에 집중하고, 그룹 레슨은 함께 랠리하며 수업 분위기를 만들기 좋습니다.",
  },
  {
    question: "수강료는 어디서 확인하나요?",
    answer:
      "레슨 형태, 횟수, 일정에 따라 달라질 수 있어 문의 접수 후 상담을 통해 안내합니다.",
  },
];

export default function AcademyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto max-w-6xl space-y-10 md:space-y-12">
        <section className="rounded-2xl border border-border bg-card px-5 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-3xl space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-success">
                도깨비테니스 레슨 안내
              </p>
              <h1 className="break-keep text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                도깨비테니스 아카데미
              </h1>
              <p className="break-keep text-base leading-7 text-foreground/80 md:text-lg">
                입문자부터 실전 플레이어까지, 목표와 레벨에 맞춘 테니스
                레슨을 안내합니다. 기본기, 랠리, 경기 운영까지 필요한
                방향을 상담하며 함께 찾아보세요.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/board/qna/write?category=academy">
                  레슨 문의하기
                </Link>
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled
                className="w-full sm:w-auto"
              >
                레슨 신청하기 준비 중
              </Button>
            </div>
            <p className="break-keep text-sm leading-6 text-muted-foreground">
              신청서는 다음 단계에서 제공될 예정입니다. 현재는 문의하기를
              통해 레슨 상담을 남겨주세요.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="break-keep text-2xl font-semibold text-foreground">
              레슨 프로그램
            </h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">
              목적과 경험에 맞춰 상담 후 적합한 수업 방향을 안내합니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lessonPrograms.map((program) => (
              <Card key={program.title} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="break-keep text-lg">
                    {program.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="break-keep text-sm leading-6 text-muted-foreground">
                    {program.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="break-keep text-2xl font-semibold text-foreground">
              수업 진행 흐름
            </h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">
              문의를 남겨주시면 레벨과 목표를 확인한 뒤 가능한 일정을 함께
              조율합니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {lessonFlow.map((step, index) => (
              <Card key={step} className="border-border bg-card">
                <CardContent className="space-y-3 p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                    {index + 1}
                  </div>
                  <p className="break-keep font-semibold text-foreground">
                    {step}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="break-keep text-2xl font-semibold text-foreground">
              안내 및 FAQ
            </h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">
              레슨 문의 전 자주 확인하는 내용을 정리했습니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.question} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="break-keep text-base">
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="break-keep text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card px-5 py-7 text-center shadow-sm md:px-8">
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="break-keep text-2xl font-semibold text-foreground">
              나에게 맞는 레슨이 궁금하다면 문의해 주세요
            </h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">
              도깨비테니스 아카데미가 레벨, 목표, 가능한 일정을 확인해 상담을
              도와드리겠습니다.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/board/qna/write?category=academy">레슨 문의하기</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
