import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminDonationGuidanceForm } from "@/components/admin/admin-donation-guidance-form";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminSiteContent } from "@/features/site-content/site-content.admin-repository";
import { listAdminSiteContentAuditHistory } from "@/features/site-content/site-content.audit-repository";
import { formatAdminDate } from "@/lib/format-admin-date";

export default async function Page({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const [detail, audit] = await Promise.all([
    getAdminSiteContent("donation-guidance"),
    listAdminSiteContentAuditHistory({ key: "donation-guidance", limit: 50 }),
  ]);
  return (
    <div className="space-y-8">
      <AdminFormPageHeader backHref="/admin/site-content" backLabel="공식 콘텐츠 관리" eyebrow="시설 공식 정보 · 후원 안내" title="후원 안내 관리" description="공개 후원 페이지의 안내 문구와 문의 경로를 관리합니다." />
      {(await searchParams).saved === "1" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">후원 안내를 저장했습니다.</p>
      ) : null}
      <div className="max-w-4xl space-y-3">
        <p>{detail.persisted ? <>MongoDB 저장됨 · 최근 수정 <time dateTime={detail.updatedAt!}>{formatAdminDate(detail.updatedAt!)}</time></> : "현재 코드 기본 콘텐츠를 사용 중입니다."}</p>
        <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/support/donation">공개 후원 페이지 보기</Link>
      </div>
      <AdminFormGuidance title="공개 전 확인" description="저장하면 공개 후원 안내가 즉시 변경됩니다.">
        공식 확인이 끝나지 않은 계좌번호, 예금주나 결제 정보는 입력하지 마세요.
      </AdminFormGuidance>
      <AdminDonationGuidanceForm initialContent={detail.content} expectedUpdatedAt={detail.updatedAt} />
      <AdminAuditHistory items={audit} />
    </div>
  );
}
