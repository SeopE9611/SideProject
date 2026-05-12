import type { Metadata } from "next";

import AcademyApplyClient from "@/app/academy/apply/_components/AcademyApplyClient";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "레슨 신청하기 | 도깨비테니스 아카데미",
};

const notices = [
  "신청 접수 후 운영자가 확인합니다.",
  "수업 일정/비용은 상담 후 확정됩니다.",
  "아직 결제는 진행되지 않습니다.",
];

export default function AcademyApplyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-success">
            도깨비테니스 아카데미
          </p>
          <h1 className="break-keep text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            레슨 신청하기
          </h1>
          <p className="break-keep text-base leading-7 text-muted-foreground md:text-lg">
            신청서를 남겨주시면 도깨비테니스에서 확인 후 상담을 도와드립니다.
          </p>
        </section>

        <Card className="border-border bg-card">
          <CardContent className="p-5 md:p-6">
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {notices.map((notice) => (
                <li key={notice} className="flex gap-2 break-keep">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{notice}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <AcademyApplyClient />
      </div>
    </main>
  );
}
