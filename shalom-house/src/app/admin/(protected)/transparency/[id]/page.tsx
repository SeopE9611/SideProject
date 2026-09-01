import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminContentDeleteForm } from "@/components/admin/admin-content-delete-form";
import { notFound } from "next/navigation";
import { AdminTransparencyArchiveForm } from "@/components/admin/admin-transparency-archive-form";
import { AdminTransparencyPublishForm } from "@/components/admin/admin-transparency-publish-form";
import { AdminTransparencyPublicationStateForm } from "@/components/admin/admin-transparency-publication-state-form";
import { AdminTransparencyReviewDecisionForm } from "@/components/admin/admin-transparency-review-decision-form";
import { AdminTransparencyReviewForm } from "@/components/admin/admin-transparency-review-form";
import { listAdminTransparencyAuditHistory } from "@/features/transparency/transparency.audit-repository";
import { findAdminTransparencyDocumentById } from "@/features/transparency/transparency.admin-repository";
import { transparencyCategoryLabels } from "@/features/transparency/transparency.types";
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
  const rows = [
    ["게시 상태", document.publicationStatus],
    ["승인 상태", document.approvalStatus],
    ["개인정보 검토 상태", document.privacyReviewStatus],
    ["최종본 상태", document.finalDocumentStatus],
    ["현재 공개 여부", document.isPubliclyVisible ? "공개 중" : `비공개 (${document.publicVisibilityReason})`],
    ["게시일", document.publishedAt ?? "없음"],
    ["제목", document.title],
    ["분류", transparencyCategoryLabels[document.category]],
    ["기준 기간", document.periodLabel],
    ["문서일", document.documentDate],
    ["요약", document.summary || "없음"],
    ["생성일", document.createdAt],
    ["수정일", document.updatedAt],
  ];
  return (
    <div className="min-w-0 space-y-8">
      <header>
        <Link href="/admin/transparency" className="underline">
          ← 자료공개 관리로 돌아가기
        </Link>
        <h1 className="mt-4 text-safe-wrap text-title font-bold">{document.title}</h1>
      </header>
      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/admin/transparency/${document.id}/media`}
          target="_blank"
          rel="noreferrer"
          className="min-h-11 border px-4 py-3"
        >
          문서 미리보기
        </a>
        {document.isPubliclyVisible ? (
          <a
            href={`/api/transparency/${document.slug}/document`}
            target="_blank"
            rel="noreferrer"
            className="min-h-11 border px-4 py-3"
          >
            공개 PDF 확인
          </a>
        ) : null}
        {document.isEditable && canUpdate ? (
          <Link href={`/admin/transparency/${document.id}/edit`} className="min-h-11 border px-4 py-3">
            메타데이터 수정
          </Link>
        ) : null}
      </div>
      <section className="rounded-card border p-5">
        <h2 className="font-bold">파일</h2>
        <dl className="mt-3">
          <dt>원본 파일명</dt>
          <dd className="text-safe-wrap break-all">{document.file.originalFileName}</dd>
          <dt>파일 크기</dt>
          <dd>{document.file.byteSize.toLocaleString()} bytes</dd>
        </dl>
      </section>
      <dl className="grid gap-4 rounded-card border p-5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="text-safe-wrap">{value}</dd>
          </div>
        ))}
      </dl>
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
