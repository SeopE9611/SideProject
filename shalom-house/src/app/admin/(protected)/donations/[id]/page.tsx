import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminDonation } from "@/features/donations/donation.admin-repository";
import { donationAuditActionLabels, donationAuditFieldLabels } from "@/features/donations/donation.audit";
import {
  donationMethodLabels,
  donationPurposeLabels,
  donationReceiptStatusLabels,
  donationStatusLabels,
} from "@/features/donations/donation.types";
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
  const donation = await getAdminDonation((await params).id);
  if (!donation) notFound();

  return (
    <div className="space-y-8">
      {saved ? <p role="status" className="rounded-control border border-border bg-surface px-4 py-3 font-semibold">후원금 기록을 저장했습니다.</p> : null}
      <AdminDetailHeader
        backHref="/admin/donations"
        backLabel="후원금 관리대장"
        eyebrow="후원 · 상세"
        title={donation.reference}
        actions={<Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/donations/${donation.id}/edit`}>편집</Link>}
      />

      <AdminStatusSummary items={[
        { label: "기록 상태", value: donationStatusLabels[donation.status], emphasized: true },
        { label: "후원 일자", value: <time dateTime={donation.donatedOn}>{donation.donatedOn}</time> },
        { label: "금액", value: `${new Intl.NumberFormat("ko-KR").format(donation.amountWon)}원` },
        { label: "최근 수정", value: <DateValue value={donation.updatedAt} /> },
      ]} />

      {donation.status === "confirmed" ? <aside className="rounded-card border border-border-strong bg-surface-subtle p-5" aria-label="확정 후원금 수정 안내"><p className="font-semibold">확정된 후원금의 금액·일자·후원자는 수정할 수 없습니다.</p><p className="mt-1">오류가 있으면 기존 기록을 무효 처리한 뒤 새 기록을 등록하세요.</p></aside> : null}

      <section aria-labelledby="donation-information-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="donation-information-heading" className="text-heading font-bold">후원 정보</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-small font-semibold text-muted-foreground">후원 당시 후원자</dt><dd className="mt-1 break-words">{donation.donorNameSnapshot} ({donation.donorReferenceSnapshot ?? "익명"})</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">방식</dt><dd className="mt-1">{donationMethodLabels[donation.method]}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">목적</dt><dd className="mt-1 break-words">{donationPurposeLabels[donation.purpose]}{donation.purposeDescription ? ` ${donation.purposeDescription}` : ""}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">영수증 처리</dt><dd className="mt-1">{donationReceiptStatusLabels[donation.receiptStatus]}{donation.receiptIssuedOn ? <> · <time dateTime={donation.receiptIssuedOn}>{donation.receiptIssuedOn}</time></> : ""}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">무효 사유</dt><dd className="mt-1 break-words">{donation.voidReason || "—"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-small font-semibold text-muted-foreground">내부 메모</dt><dd className="mt-1 whitespace-pre-wrap break-words">{donation.internalNote || "—"}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">생성일</dt><dd className="mt-1"><DateValue value={donation.createdAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">확정일</dt><dd className="mt-1"><DateValue value={donation.confirmedAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">무효일</dt><dd className="mt-1"><DateValue value={donation.voidedAt} /></dd></div>
        </dl>
      </section>

      <section aria-labelledby="donation-audit-heading" className="min-w-0 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="donation-audit-heading" className="text-heading font-bold">감사 이력</h2><p className="text-small text-muted-foreground">총 {donation.audit.length}건</p></div>
        {donation.audit.length ? <ol className="mt-5 space-y-5">{donation.audit.map((event, index) => <li key={`${event.occurredAt}-${index}`} className="min-w-0 border-t border-border pt-4 first:border-t-0 first:pt-0">
          <p className="font-bold">{(donationAuditActionLabels as Record<string, string>)[event.action]}</p>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-small font-semibold text-muted-foreground">작업 관리자</dt><dd className="break-words">{event.displayName}</dd></div>
            <div><dt className="text-small font-semibold text-muted-foreground">변경 시각</dt><dd><time dateTime={event.occurredAt}>{formatAdminDate(event.occurredAt)}</time></dd></div>
            <div><dt className="text-small font-semibold text-muted-foreground">변경 필드</dt><dd>{event.changedFields.map((field: string) => (donationAuditFieldLabels as Record<string, string>)[field]).join(", ")}</dd></div>
            <div><dt className="text-small font-semibold text-muted-foreground">이전 상태 → 변경 상태</dt><dd>{event.fromStatus ? (donationStatusLabels as Record<string, string>)[event.fromStatus] : "신규"} → {(donationStatusLabels as Record<string, string>)[event.toStatus]}</dd></div>
          </dl>
        </li>)}</ol> : <p className="mt-4">아직 기록된 수정 이력이 없습니다.</p>}
      </section>
    </div>
  );
}
