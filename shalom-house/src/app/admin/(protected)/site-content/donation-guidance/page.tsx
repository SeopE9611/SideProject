import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminDonationGuidanceForm } from "@/components/admin/admin-donation-guidance-form";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminSiteContent } from "@/features/site-content/site-content.admin-repository";
import { listAdminSiteContentAuditHistory } from "@/features/site-content/site-content.audit-repository";

export default async function Page({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const [detail, audit] = await Promise.all([
    getAdminSiteContent("donation-guidance"),
    listAdminSiteContentAuditHistory({ key: "donation-guidance", limit: 50 }),
  ]);
  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/site-content" className="underline">← 공식 콘텐츠 관리</Link>
        <h1 className="mt-4 text-title font-bold">후원 안내 관리</h1>
        {(await searchParams).saved === "1" ? (
          <p role="status" className="mt-3 font-semibold text-primary">후원 안내를 저장했습니다.</p>
        ) : null}
        <p className="mt-3">
          {detail.persisted
            ? `MongoDB 저장됨 · 최근 수정 ${detail.updatedAt}`
            : "현재 코드 기본 콘텐츠를 사용 중입니다."}
        </p>
        <Link className="mt-3 inline-flex underline" href="/support/donation">공개 후원 페이지 보기</Link>
      </header>
      <AdminDonationGuidanceForm initialContent={detail.content} expectedUpdatedAt={detail.updatedAt} />
      <AdminAuditHistory items={audit} />
    </div>
  );
}
