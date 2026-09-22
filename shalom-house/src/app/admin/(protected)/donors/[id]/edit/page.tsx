import { notFound, redirect } from "next/navigation";

import { AdminDonorForm } from "@/components/admin/admin-donor-form";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminDonor } from "@/features/donations/donor.admin-repository";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const a = await authorizeCurrentAdmin("donations.manage");
  if (!a.ok) redirect("/admin?forbidden=1");
  const d = await getAdminDonor((await params).id);
  if (!d) notFound();
  return (
    <div className="space-y-8">
      <AdminFormPageHeader backHref={`/admin/donors/${d.id}`} backLabel="후원자 상세" eyebrow="후원자 관리 · 편집" title="후원자 편집" description="후원자 기본 정보와 이용 상태를 수정합니다." />
      <AdminFormGuidance title="개인정보 입력 주의" description="운영에 필요한 최소 정보만 입력합니다.">
        주민등록번호, 사업자등록번호, 계좌·카드번호, 건강·장애 정보와 입소자 개인정보는 입력하지 마세요.
      </AdminFormGuidance>
      <section aria-labelledby="admin-donor-form-heading">
        <h2 id="admin-donor-form-heading" className="sr-only">후원자 정보 수정</h2>
        <AdminDonorForm id={d.id} expectedUpdatedAt={d.updatedAt} initial={{ type: d.type, status: d.status, displayName: d.displayName, phone: d.phone, email: d.email, internalNote: d.internalNote }} />
      </section>
    </div>
  );
}
