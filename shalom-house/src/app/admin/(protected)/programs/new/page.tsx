import { redirect } from "next/navigation";

import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminProgramDraftForm } from "@/components/admin/admin-program-draft-form";

export const metadata: Metadata = {
  title: "프로그램 작성",
  robots: { index: false, follow: false },
};

export default async function AdminProgramCreatePage() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.create")) redirect("/admin?forbidden=1");
  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/programs" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          ← 프로그램 관리로 돌아가기
        </Link>
        <h1 className="mt-4 text-title font-bold">프로그램 작성</h1>
        <p className="mt-3 text-body text-muted-foreground">
          프로그램 운영 콘텐츠의 초안을 작성합니다.
          <br />
          저장된 프로그램은 작성 중·승인 대기 상태이며 자동으로 공개되지 않습니다.
        </p>
      </header>

      <aside aria-labelledby="admin-program-safety-heading" className="max-w-3xl rounded-card border border-border-strong bg-surface p-5">
        <h2 id="admin-program-safety-heading" className="text-heading font-bold">저장 전 안전 확인</h2>
        <p className="mt-2 text-small text-muted-foreground">초안도 게시 전 검토 대상입니다. 다음 정보는 초안에 저장하지 마세요.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-small">
          <li>거주인 이름·장애·건강·가족관계 등 개인을 식별할 수 있는 정보</li>
          <li>개인 연락처와 계정·인증정보</li>
          <li>내부 사건·사고·상담·회의·인사자료</li>
          <li>공개 권한이 확인되지 않은 사진·후원·자원봉사 정보</li>
        </ul>
      </aside>

      <section aria-labelledby="admin-program-form-heading">
        <h2 id="admin-program-form-heading" className="sr-only">프로그램 초안 입력</h2>
        <AdminProgramDraftForm mode="create" />
      </section>
    </div>
  );
}
