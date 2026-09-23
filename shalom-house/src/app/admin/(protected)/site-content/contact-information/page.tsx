import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminContactInformationForm } from "@/components/admin/admin-contact-information-form";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { getAdminSiteContent } from "@/features/site-content/site-content.admin-repository";
import { listAdminSiteContentAuditHistory } from "@/features/site-content/site-content.audit-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
export default async function Page({ searchParams }: { searchParams: Promise<{ saved?: string; debugPhone?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const params = await searchParams;
  const [detail, audit] = await Promise.all([
    getAdminSiteContent("contact-information"),
    listAdminSiteContentAuditHistory({ key: "contact-information", limit: 50 }),
  ]);
  return (
    <div className="space-y-8">
      <AdminFormPageHeader backHref="/admin/site-content" backLabel="공식 콘텐츠 관리" eyebrow="시설 공식 정보 · 연락처" title="연락처·찾아오시는 길 관리" description="주소, 대표 연락처와 공개 문의 경로를 관리합니다." />
      {params.saved === "1" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">주소와 대표 연락처를 저장했습니다.</p>
      ) : null}
      <div className="max-w-4xl space-y-3">
        <p>{detail.persisted ? <>MongoDB 저장됨 · 최근 수정 <time dateTime={detail.updatedAt!}>{formatAdminDate(detail.updatedAt!)}</time></> : "현재 코드 기본 콘텐츠를 사용 중입니다."}</p>
        <div className="flex flex-wrap gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/directions">
            찾아오시는 길 보기
          </Link>
          <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/support/contact">
            문의하기 보기
          </Link>
        </div>
      </div>
      <AdminFormGuidance title="공개 전 확인" description="저장하면 공개 연락처 정보가 즉시 변경됩니다.">
        주소와 대표 전화는 찾아오시는 길, 문의하기와 사이트 푸터에 함께 표시됩니다.
      </AdminFormGuidance>
      <AdminContactInformationForm initialContent={detail.content} expectedUpdatedAt={detail.updatedAt} debugPhone={params.debugPhone === "1"} />
      <AdminAuditHistory items={audit} />
    </div>
  );
}
