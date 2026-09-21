import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminDonor } from "@/features/donations/donor.admin-repository";
import { donorAuditActionLabels, donorAuditFieldLabels } from "@/features/donations/donor.audit";
import { donorStatusLabels, donorTypeLabels } from "@/features/donations/donor.types";
import { formatAdminDate } from "@/lib/format-admin-date";

function DateValue({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{formatAdminDate(value)}</time> : "—";
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const auth = await authorizeCurrentAdmin("donations.manage");
  if (!auth.ok) redirect("/admin?forbidden=1");
  const saved = (await searchParams).saved === "1";
  const donor = await getAdminDonor((await params).id);
  if (!donor) notFound();

  return (
    <div className="space-y-8">
      {saved ? <p role="status" className="rounded-control border border-border bg-surface px-4 py-3 font-semibold">후원자 정보를 저장했습니다.</p> : null}
      <AdminDetailHeader
        backHref="/admin/donors"
        backLabel="후원자 관리"
        eyebrow="후원자 · 상세"
        title={donor.displayName}
        actions={<>
          <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/donors/${donor.id}/edit`}>편집</Link>
          <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/donations?donorId=${donor.id}`}>후원 기록 보기</Link>
        </>}
      />

      <AdminStatusSummary items={[
        { label: "참조번호", value: donor.reference },
        { label: "유형", value: donorTypeLabels[donor.type] },
        { label: "상태", value: donorStatusLabels[donor.status], emphasized: true },
        { label: "최근 수정", value: <DateValue value={donor.updatedAt} /> },
      ]} />

      <section aria-labelledby="donor-information-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="donor-information-heading" className="text-heading font-bold">후원자 정보</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-small font-semibold text-muted-foreground">전화번호</dt><dd className="mt-1 break-words">{donor.phone || "—"}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">이메일</dt><dd className="mt-1 break-all">{donor.email || "—"}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">생성일</dt><dd className="mt-1"><DateValue value={donor.createdAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">보관일</dt><dd className="mt-1"><DateValue value={donor.archivedAt} /></dd></div>
          <div className="sm:col-span-2"><dt className="text-small font-semibold text-muted-foreground">내부 메모</dt><dd className="mt-1 whitespace-pre-wrap break-words">{donor.internalNote || "—"}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="donor-audit-heading" className="min-w-0 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="donor-audit-heading" className="text-heading font-bold">감사 이력</h2><p className="text-small text-muted-foreground">총 {donor.audit.length}건</p></div>
        {donor.audit.length ? <ol className="mt-5 space-y-5">{donor.audit.map((event, index) => <li key={`${event.occurredAt}-${index}`} className="min-w-0 border-t border-border pt-4 first:border-t-0 first:pt-0">
          <p className="font-bold">{(donorAuditActionLabels as Record<string, string>)[event.action]}</p>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-small font-semibold text-muted-foreground">작업 관리자</dt><dd className="break-words">{event.displayName}</dd></div>
            <div><dt className="text-small font-semibold text-muted-foreground">변경 시각</dt><dd><time dateTime={event.occurredAt}>{formatAdminDate(event.occurredAt)}</time></dd></div>
            <div className="sm:col-span-2"><dt className="text-small font-semibold text-muted-foreground">변경 필드</dt><dd>{event.changedFields.map((field: string) => (donorAuditFieldLabels as Record<string, string>)[field]).join(", ")}</dd></div>
          </dl>
        </li>)}</ol> : <p className="mt-4">아직 기록된 수정 이력이 없습니다.</p>}
      </section>
    </div>
  );
}
