import { redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminFacilityOverviewForm } from "@/components/admin/admin-facility-overview-form";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminSiteContent } from "@/features/site-content/site-content.admin-repository";
import { listAdminSiteContentAuditHistory } from "@/features/site-content/site-content.audit-repository";
export default async function Page({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const [detail, audit] = await Promise.all([
    getAdminSiteContent("facility-overview"),
    listAdminSiteContentAuditHistory({ key: "facility-overview", limit: 50 }),
  ]);
  return (
    <div className="space-y-8">
      <AdminFormPageHeader
        backHref="/admin/site-content"
        backLabel="공식 콘텐츠 관리"
        eyebrow="시설 공식 정보 · 시설개요"
        title="시설개요 편집"
        description="공개 홈페이지의 시설 소개 내용을 관리합니다."
      />
      {(await searchParams).saved === "1" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          저장했습니다.
        </p>
      ) : null}
      <AdminFormGuidance title="공개 전 확인" description="저장하면 현재 공개 시설개요가 즉시 변경됩니다.">
        시설 기본 정보, 생활 원칙, 생활 장면과 공개 원칙을 저장 전에 확인해 주세요.
      </AdminFormGuidance>
      <AdminFacilityOverviewForm content={detail.content} updatedAt={detail.updatedAt} />
      <AdminAuditHistory items={audit} />
    </div>
  );
}
