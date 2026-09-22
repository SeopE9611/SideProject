import { redirect } from "next/navigation";

import { AdminDonationForm } from "@/components/admin/admin-donation-form";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { listActiveDonorOptions } from "@/features/donations/donor.admin-repository";

export default async function Page() {
  const a = await authorizeCurrentAdmin("donations.manage");
  if (!a.ok) redirect("/admin?forbidden=1");
  return (
    <div className="space-y-8">
      <AdminFormPageHeader
        backHref="/admin/donations"
        backLabel="후원금 관리대장"
        eyebrow="후원금 관리 · 등록"
        title="후원금 등록"
        description="후원자, 후원 일자, 금액과 처리 상태를 기록합니다."
      />
      <AdminFormGuidance title="저장 전 확인" description="후원금 기록은 상태에 따라 수정 가능한 항목이 제한됩니다.">
        주민등록번호, 사업자등록번호, 계좌·카드번호, 건강·장애 정보와 입소자 개인정보는 입력하지 마세요. 영수증 상태는
        외부 처리 결과를 표시할 뿐 실제 영수증을 발급하지 않습니다.
      </AdminFormGuidance>
      <section aria-labelledby="admin-donation-form-heading">
        <h2 id="admin-donation-form-heading" className="sr-only">후원금 정보 입력</h2>
        <AdminDonationForm donors={await listActiveDonorOptions()} />
      </section>
    </div>
  );
}
