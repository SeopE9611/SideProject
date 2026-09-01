import { notFound, redirect } from "next/navigation";
import { AdminInquiryUpdateForm } from "@/components/admin/admin-inquiry-update-form";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminInquiry } from "@/features/inquiries/inquiry.admin-repository";
import { inquiryAuditActionLabels, inquiryAuditFieldLabels } from "@/features/inquiries/inquiry.audit";
import { inquiryKindLabels, inquiryStatusLabels } from "@/features/inquiries/inquiry.types";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCurrentAdmin("inquiries.manage");
  if (!auth.ok) redirect("/admin?forbidden=1");
  const inquiry = await getAdminInquiry((await params).id);
  if (!inquiry) notFound();
  const date = (value: string | null) => (value ? new Date(value).toLocaleString("ko-KR") : "—");
  return (
    <div>
      <h1 className="text-title font-bold">문의 상세</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt>접수번호</dt>
          <dd>{inquiry.reference}</dd>
        </div>
        <div>
          <dt>문의 종류</dt>
          <dd>{inquiryKindLabels[inquiry.kind]}</dd>
        </div>
        <div>
          <dt>처리 상태</dt>
          <dd>{inquiryStatusLabels[inquiry.status]}</dd>
        </div>
        <div>
          <dt>이름</dt>
          <dd>{inquiry.name}</dd>
        </div>
        <div>
          <dt>전화번호</dt>
          <dd>{inquiry.phone ? <a href={createTelephoneHref(inquiry.phone)}>{inquiry.phone}</a> : "—"}</dd>
        </div>
        <div>
          <dt>이메일</dt>
          <dd>{inquiry.email ? <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a> : "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt>문의 내용</dt>
          <dd className="whitespace-pre-wrap break-words">{inquiry.message}</dd>
        </div>
        <div>
          <dt>개인정보 동의 버전</dt>
          <dd>{inquiry.privacyConsentVersion}</dd>
        </div>
        <div>
          <dt>동의 시각</dt>
          <dd>{date(inquiry.privacyConsentedAt)}</dd>
        </div>
        <div>
          <dt>접수 시각</dt>
          <dd>{date(inquiry.createdAt)}</dd>
        </div>
        <div>
          <dt>최근 수정</dt>
          <dd>{date(inquiry.updatedAt)}</dd>
        </div>
        <div>
          <dt>처리 완료 시각</dt>
          <dd>{date(inquiry.completedAt)}</dd>
        </div>
        <div>
          <dt>보관 시각</dt>
          <dd>{date(inquiry.archivedAt)}</dd>
        </div>
        <div>
          <dt>자동 삭제 예정 시각</dt>
          <dd>{date(inquiry.deleteAfter)}</dd>
        </div>
      </dl>
      <section className="mt-10">
        <h2 className="text-heading font-bold">처리 정보 수정</h2>
        <AdminInquiryUpdateForm
          id={inquiry.id}
          expectedUpdatedAt={inquiry.updatedAt}
          initialStatus={inquiry.status}
          initialInternalNote={inquiry.internalNote}
        />
      </section>
      <section className="mt-10">
        <h2 className="text-heading font-bold">감사 이력</h2>
        {inquiry.audit.map((event, i) => (
          <div key={`${event.occurredAt}-${i}`} className="mt-3 border-t pt-3">
            <p>
              {inquiryAuditActionLabels[event.action]} · {event.displayName} · {date(event.occurredAt)}
            </p>
            <p>
              {event.changedFields.map((f) => inquiryAuditFieldLabels[f]).join(", ")} ·{" "}
              {inquiryStatusLabels[event.fromStatus]} → {inquiryStatusLabels[event.toStatus]}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
