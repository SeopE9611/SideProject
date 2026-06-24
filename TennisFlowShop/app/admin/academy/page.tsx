import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, ClipboardCheck, Compass, Users } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "아카데미 관리",
};

const guideItems = [
  {
    title: "클래스 개설·노출 관리",
    description: "운영 일정, 모집 정보, 노출 상태를 기준에 맞춰 점검하세요.",
    icon: BookOpenCheck,
  },
  {
    title: "신청 접수 확인",
    description: "신규 신청 접수 현황을 확인하고 후속 상담 대상을 분류하세요.",
    icon: ClipboardCheck,
  },
  {
    title: "상담·등록 확정",
    description: "상담 진행 상황과 등록 확정 단계를 구분해 누락 없이 처리하세요.",
    icon: Users,
  },
  {
    title: "모집 상태 점검",
    description: "모집 중·마감 클래스를 주기적으로 확인해 공백을 줄이세요.",
    icon: Compass,
  },
] as const;

export default function AcademyHubPage() {
  return (
    <div className="p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AdminPageHeader
          title="아카데미 관리"
          description="클래스 운영과 신청 관리를 한 곳에서 시작합니다."
          helperText="클래스 개설·노출 상태와 신청 접수·확정 흐름을 구분해 관리하세요."
          scope="범위: 아카데미 운영 허브"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/operations">오늘 처리할 일 보기</Link>
            </Button>
          }
        />

        <section
          aria-label="아카데미 업무 가이드"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {guideItems.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-border/70 bg-background/90 shadow-none">
              <CardHeader className="space-y-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold break-keep leading-relaxed">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground break-keep leading-relaxed">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-label="아카데미 핵심 이동" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base break-keep leading-relaxed">클래스 관리</CardTitle>
              <CardDescription className="text-sm break-keep leading-relaxed">
                클래스 개설, 노출 상태, 모집 인원과 운영 정보를 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild type="button">
                <Link href="/admin/academy/classes">클래스 관리로 이동</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base break-keep leading-relaxed">신청 관리</CardTitle>
              <CardDescription className="text-sm break-keep leading-relaxed">
                수강 신청 접수, 상담 상태, 등록 확정 여부를 확인합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild type="button" variant="secondary">
                <Link href="/admin/academy/applications">신청 관리로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
