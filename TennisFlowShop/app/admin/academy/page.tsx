import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, ClipboardCheck, Compass, Users } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageSection from "@/components/admin/AdminPageSection";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <AdminPageShell>
      <div className="flex flex-col gap-6">
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
            <div key={title} className={cn(adminSurface.cardMuted, "p-4")}>
              <div className={cn("flex items-center gap-2", adminTypography.bodyStrong)}>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{title}</span>
              </div>
              <p className={cn("mt-2 break-keep", adminTypography.metaMuted)}>{description}</p>
            </div>
          ))}
        </section>

        <section aria-label="아카데미 핵심 이동" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminPageSection
            title="클래스 관리"
            description="클래스 개설, 노출 상태, 모집 인원과 운영 정보를 관리합니다."
            contentClassName="pt-5"
          >
            <Button asChild type="button">
              <Link href="/admin/academy/classes">클래스 관리로 이동</Link>
            </Button>
          </AdminPageSection>

          <AdminPageSection
            title="신청 관리"
            description="수강 신청 접수, 상담 상태, 등록 확정 여부를 확인합니다."
            contentClassName="pt-5"
          >
            <Button asChild type="button" variant="outline">
              <Link href="/admin/academy/applications">신청 관리로 이동</Link>
            </Button>
          </AdminPageSection>
        </section>
      </div>
    </AdminPageShell>
  );
}
