import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminContentDeleteForm } from "@/components/admin/admin-content-delete-form";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { notFound } from "next/navigation";
import { AdminTransparencyArchiveForm } from "@/components/admin/admin-transparency-archive-form";
import { AdminTransparencyPublishForm } from "@/components/admin/admin-transparency-publish-form";
import { AdminTransparencyPublicationStateForm } from "@/components/admin/admin-transparency-publication-state-form";
import { AdminTransparencyReviewDecisionForm } from "@/components/admin/admin-transparency-review-decision-form";
import { AdminTransparencyReviewForm } from "@/components/admin/admin-transparency-review-form";
import { listAdminTransparencyAuditHistory } from "@/features/transparency/transparency.audit-repository";
import { findAdminTransparencyDocumentById } from "@/features/transparency/transparency.admin-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
import {
  transparencyApprovalStatusLabels,
  transparencyCategoryLabels,
  transparencyFinalDocumentStatusLabels,
  transparencyPrivacyReviewStatusLabels,
  transparencyPublicationStatusLabels,
} from "@/features/transparency/transparency.types";
export default async function TransparencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const document = await findAdminTransparencyDocumentById((await params).id);
  if (!document) notFound();
  const admin = await getCurrentAdmin();
  const canUpdate = Boolean(admin && hasAdminPermission(admin, "content.update"));
  const canDelete = Boolean(admin && hasAdminPermission(admin, "content.delete"));
  const canRequestReview = Boolean(admin && hasAdminPermission(admin, "content.request_review"));
  const canDecideReview = Boolean(admin && hasAdminPermission(admin, "content.decide_review"));
  const canPublish = Boolean(admin && hasAdminPermission(admin, "content.publish"));
  const canArchive = Boolean(admin && hasAdminPermission(admin, "content.archive"));
  const auditHistory = await listAdminTransparencyAuditHistory({
    contentId: document.id,
  });
  const rows: Array<[string, ReactNode]> = [
    [
      "게시일",
      document.publishedAt ? (
        <time dateTime={document.publishedAt}>{formatAdminDate(document.publishedAt)}</time>
      ) : (
        "없음"
      ),
    ],
    ["분류", transparencyCategoryLabels[document.category]],
    ["기준 기간", document.periodLabel],
    ["문서일", document.documentDate],
    ["요약", document.summary || "없음"],
    [
      "생성일",
      <time dateTime={document.createdAt}>
        {formatAdminDate(document.createdAt)}
      </time>,
    ],
  ];
  return (
    <div className="min-w-0 space-y-8">
      <AdminDetailHeader
        backHref="/admin/transparency"
        backLabel="자료공개 관리로 돌아가기"
        eyebrow={`자료공개 · ${transparencyCategoryLabels[document.category]}`}
        title={document.title}
        actions={
          <>
            {document.isEditable && canUpdate ? (
              <Link href={`/admin/transparency/${document.id}/edit`} className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                메타데이터 수정
              </Link>
            ) : null}
            <a href={`/api/admin/transparency/${document.id}/media`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
              문서 미리보기
            </a>
            {document.isPubliclyVisible ? (
              <a href={`/api/transparency/${document.slug}/document`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                공개 PDF 확인
              </a>
            ) : null}
          </>
        }
      />
      <AdminStatusSummary
        items={[
          { label: "게시 상태", value: transparencyPublicationStatusLabels[document.publicationStatus] },
          { label: "승인 상태", value: transparencyApprovalStatusLabels[document.approvalStatus] },
          { label: "공개 여부", value: document.isPubliclyVisible ? "공개 중" : `비공개 (${document.publicVisibilityReason})`, emphasized: true },
          { label: "개인정보 검토", value: transparencyPrivacyReviewStatusLabels[document.privacyReviewStatus] },
          { label: "최종본", value: transparencyFinalDocumentStatusLabels[document.finalDocumentStatus] },
          { label: "최근 수정", value: <time dateTime={document.updatedAt}>{formatAdminDate(document.updatedAt)}</time> },
        ]}
      />
      <section className="rounded-card border p-5">
        <h2 className="font-bold">파일</h2>
        <dl className="mt-3">
          <dt>원본 파일명</dt>
          <dd className="text-safe-wrap break-all">{document.file.originalFileName}</dd>
          <dt>파일 크기</dt>
          <dd>{document.file.byteSize.toLocaleString()} bytes</dd>
        </dl>
      </section>
      <section aria-labelledby="admin-transparency-document-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="admin-transparency-document-heading" className="text-heading font-bold">문서 정보</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-small font-semibold text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-safe-wrap">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {document.canRequestReview && canRequestReview ? (
        <AdminTransparencyReviewForm id={document.id} expectedUpdatedAt={document.updatedAt} />
      ) : null}
      {document.canDecideReview && canDecideReview ? (
        <AdminTransparencyReviewDecisionForm id={document.id} expectedUpdatedAt={document.updatedAt} />
      ) : null}
      {document.canPublish && canPublish ? (
        <AdminTransparencyPublishForm id={document.id} expectedUpdatedAt={document.updatedAt} />
      ) : null}
      {document.canManagePublicationState && canPublish ? (
        <AdminTransparencyPublicationStateForm id={document.id} expectedUpdatedAt={document.updatedAt} />
      ) : null}
      {document.isArchivable && canArchive ? (
        <AdminTransparencyArchiveForm id={document.id} expectedUpdatedAt={document.updatedAt} />
      ) : null}
      {canDelete ? (
        <section aria-labelledby="delete-content-heading" className="rounded-card border-2 border-foreground p-5">
          <h2 id="delete-content-heading" className="text-heading font-bold">
            위험 영역: 콘텐츠 삭제
          </h2>
          <AdminContentDeleteForm
            id={document.id}
            title={document.title}
            endpoint={`/api/admin/transparency/${document.id}/delete`}
            expectedUpdatedAt={document.updatedAt}
          />
        </section>
      ) : null}
      <AdminAuditHistory items={auditHistory} />
    </div>
  );
}
