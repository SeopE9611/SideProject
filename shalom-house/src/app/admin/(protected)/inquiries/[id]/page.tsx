import { notFound, redirect } from "next/navigation";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminInquiryUpdateForm } from "@/components/admin/admin-inquiry-update-form";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { AdminWorkflowPanel } from "@/components/admin/admin-workflow-panel";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminInquiry } from "@/features/inquiries/inquiry.admin-repository";
import { inquiryAuditActionLabels, inquiryAuditFieldLabels } from "@/features/inquiries/inquiry.audit";
import { inquiryKindLabels, inquiryStatusLabels } from "@/features/inquiries/inquiry.types";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import { formatAdminDate } from "@/lib/format-admin-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function DateValue({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{formatAdminDate(value)}</time> : "—";
}

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCurrentAdmin("inquiries.manage");
  if (!auth.ok) redirect("/admin?forbidden=1");
  const inquiry = await getAdminInquiry((await params).id);
  if (!inquiry) notFound();

  return (
    <div className="space-y-8">
      <AdminDetailHeader backHref="/admin/inquiries" backLabel="문의 관리" eyebrow="문의 · 상세" title={inquiry.reference} />

      <AdminStatusSummary items={[
        { label: "문의 종류", value: inquiryKindLabels[inquiry.kind] },
        { label: "처리 상태", value: inquiryStatusLabels[inquiry.status], emphasized: true },
        { label: "접수 시각", value: <DateValue value={inquiry.createdAt} /> },
        { label: "최근 수정", value: <DateValue value={inquiry.updatedAt} /> },
      ]} />

      <section aria-labelledby="inquiry-information-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="inquiry-information-heading" className="text-heading font-bold">문의 정보</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-small font-semibold text-muted-foreground">이름</dt><dd className="mt-1 break-words">{inquiry.name}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">전화번호</dt><dd className="mt-1">{inquiry.phone ? <a className="text-primary underline underline-offset-4" href={createTelephoneHref(inquiry.phone)}>{inquiry.phone}</a> : "—"}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">이메일</dt><dd className="mt-1 break-all">{inquiry.email ? <a className="text-primary underline underline-offset-4" href={`mailto:${inquiry.email}`}>{inquiry.email}</a> : "—"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-small font-semibold text-muted-foreground">문의 내용</dt><dd className="mt-1 whitespace-pre-wrap break-words">{inquiry.message}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">개인정보 동의 버전</dt><dd className="mt-1 break-words">{inquiry.privacyConsentVersion}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">동의 시각</dt><dd className="mt-1"><DateValue value={inquiry.privacyConsentedAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">처리 완료 시각</dt><dd className="mt-1"><DateValue value={inquiry.completedAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">보관 시각</dt><dd className="mt-1"><DateValue value={inquiry.archivedAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">자동 삭제 예정 시각</dt><dd className="mt-1"><DateValue value={inquiry.deleteAfter} /></dd></div>
        </dl>
      </section>

      <AdminWorkflowPanel title="처리 정보 수정" description="처리 상태와 내부 운영 메모를 관리합니다.">
        <div className="mt-5">
          <AdminInquiryUpdateForm id={inquiry.id} expectedUpdatedAt={inquiry.updatedAt} initialStatus={inquiry.status} initialInternalNote={inquiry.internalNote} />
        </div>
      </AdminWorkflowPanel>

      <section aria-labelledby="inquiry-audit-heading" className="min-w-0 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="inquiry-audit-heading" className="text-heading font-bold">감사 이력</h2>
          <p className="text-small text-muted-foreground">총 {inquiry.audit.length}건</p>
        </div>
        {inquiry.audit.length ? (
          <ol className="mt-5 space-y-5">
            {inquiry.audit.map((event, i) => (
              <li key={`${event.occurredAt}-${i}`} className="min-w-0 border-t border-border pt-4 first:border-t-0 first:pt-0">
                <p className="font-bold">{inquiryAuditActionLabels[event.action]}</p>
                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div><dt className="text-small font-semibold text-muted-foreground">작업 관리자</dt><dd className="break-words">{event.displayName}</dd></div>
                  <div><dt className="text-small font-semibold text-muted-foreground">변경 시각</dt><dd><time dateTime={event.occurredAt}>{formatAdminDate(event.occurredAt)}</time></dd></div>
                  <div><dt className="text-small font-semibold text-muted-foreground">변경 필드</dt><dd>{event.changedFields.map((field) => inquiryAuditFieldLabels[field]).join(", ")}</dd></div>
                  <div><dt className="text-small font-semibold text-muted-foreground">이전 상태 → 변경 상태</dt><dd>{inquiryStatusLabels[event.fromStatus]} → {inquiryStatusLabels[event.toStatus]}</dd></div>
                </dl>
              </li>
            ))}
          </ol>
        ) : <p className="mt-4">아직 기록된 수정 이력이 없습니다.</p>}
      </section>
    </div>
  );
}
