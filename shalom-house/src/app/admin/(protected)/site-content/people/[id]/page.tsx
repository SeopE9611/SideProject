import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminStaffProfile } from "@/features/staff/staff.admin-repository";
import { getStaffPublicationStatusLabel } from "@/features/staff/staff.types";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const { id } = await params;
  const d = await getAdminStaffProfile(id);
  if (!d) notFound();
  const rows = [
    ["직책·역할", d.role],
    ["담당 업무", d.responsibility],
    ["직원 이름", d.name || "입력 없음"],
    ["이름 공개 여부", d.showName ? "공개" : "비공개"],
    ["이름 공개 확인 여부", d.nameDisclosureConfirmed ? "확인" : "미확인"],
    ["이름 공개 확인 근거", d.nameDisclosureReference || "없음"],
    ["공개 상태", getStaffPublicationStatusLabel(d.publicationStatus)],
    ["표시 순서", String(d.displayOrder)],
    ["생성일", d.createdAt],
    ["수정일", d.updatedAt],
    ["게시일", d.publishedAt ?? "없음"],
    ["보관일", d.archivedAt ?? "없음"],
  ];
  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/site-content/people" className="underline">
          ← 함께하는 사람들 관리
        </Link>
        <h1 className="mt-4 text-title font-bold">직원 소개 상세</h1>
        {(await searchParams).saved === "1" ? <p role="status">저장했습니다.</p> : null}
        <Link className="mt-4 inline-block min-h-11 underline" href={`/admin/site-content/people/${id}/edit`}>
          편집
        </Link>
      </header>
      <dl className="grid gap-4 rounded-card border p-5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="font-bold text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
      <AdminAuditHistory items={d.auditHistory} />
    </div>
  );
}
