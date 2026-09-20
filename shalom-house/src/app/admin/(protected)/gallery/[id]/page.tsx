import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminContentDeleteForm } from "@/components/admin/admin-content-delete-form";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { notFound } from "next/navigation";
import { AdminGalleryReviewForm } from "@/components/admin/admin-gallery-review-form";
import { AdminGalleryReviewDecisionForm } from "@/components/admin/admin-gallery-review-decision-form";
import { AdminGalleryPublishForm } from "@/components/admin/admin-gallery-publish-form";
import { AdminGalleryPublicationStateForm } from "@/components/admin/admin-gallery-publication-state-form";
import { AdminGalleryConsentWithdrawalForm } from "@/components/admin/admin-gallery-consent-withdrawal-form";
import { AdminGalleryArchiveForm } from "@/components/admin/admin-gallery-archive-form";
import { listAdminGalleryAuditHistory } from "@/features/gallery/gallery.audit-repository";
import { findAdminGalleryItemById } from "@/features/gallery/gallery.admin-repository";
import {
  getGalleryApprovalStatusLabel,
  getGalleryConsentStatusLabel,
  getGalleryPublicationStatusLabel,
  getGallerySubjectPresenceLabel,
} from "@/features/gallery/gallery.types";
export default async function GalleryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params,
    item = await findAdminGalleryItemById(id);
  if (!item) notFound();
  const admin = await getCurrentAdmin();
  const canUpdate = Boolean(admin && hasAdminPermission(admin, "content.update"));
  const canDelete = Boolean(admin && hasAdminPermission(admin, "content.delete"));
  const canRequestReview = Boolean(admin && hasAdminPermission(admin, "content.request_review"));
  const canDecideReview = Boolean(admin && hasAdminPermission(admin, "content.decide_review"));
  const canPublish = Boolean(admin && hasAdminPermission(admin, "content.publish"));
  const canArchive = Boolean(admin && hasAdminPermission(admin, "content.archive"));
  const canWithdrawConsent = Boolean(admin && hasAdminPermission(admin, "gallery.withdraw_consent"));
  const auditHistory = await listAdminGalleryAuditHistory({
    contentId: item.id,
  });
  const details: [[string, string | number | null], ...Array<[string, string | number | null]>] = [
    ["슬러그", item.slug],
    ["분류", item.category],
    ["활동일", item.activityDate],
    ["인물 상태", getGallerySubjectPresenceLabel(item.subjectPresence)],
    ["동의 확인일", item.consentCheckedOn],
    ["동의 참조 코드", item.consentReferenceCode],
    ["게시 시작일", item.displayStartOn],
    ["게시 종료일", item.displayEndOn],
    ["bucket", item.media.bucket],
    ["object path", item.media.objectPath],
    ["MIME", item.media.mimeType],
    ["용량", `${item.media.byteSize.toLocaleString()} bytes`],
    ["이미지 크기", `${item.media.width}×${item.media.height}`],
    ["원본 파일명", item.media.originalFileName],
    ["SHA-256", `${item.media.sha256.slice(0, 12)}…`],
    ["생성일", item.createdAt],
  ];
  const editable = item.isEditable && canUpdate;
  return (
    <div className="space-y-8">
      <AdminDetailHeader
        backHref="/admin/gallery"
        backLabel="활동사진 관리로 돌아가기"
        eyebrow={`활동사진 · ${item.category}`}
        title={item.title}
        actions={
          <>
            {editable ? (
              <Link href={`/admin/gallery/${id}/edit`} className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                메타데이터 수정
              </Link>
            ) : null}
            {item.isPubliclyVisible ? (
              <Link href={`/life/gallery/${item.slug}`} className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                공개 상세 보기
              </Link>
            ) : null}
          </>
        }
      />
      <AdminStatusSummary
        items={[
          { label: "게시 상태", value: getGalleryPublicationStatusLabel(item.publicationStatus) },
          { label: "승인 상태", value: getGalleryApprovalStatusLabel(item.approvalStatus) },
          { label: "공개 여부", value: item.isPubliclyVisible ? "공개 중" : "비공개", emphasized: true },
          { label: "동의 상태", value: getGalleryConsentStatusLabel(item.consentStatus) },
          { label: "최근 수정", value: item.updatedAt },
        ]}
      />
      <section>
        <h2 className="text-heading font-bold">비공개 미리보기</h2>
        <img
          src={`/api/admin/gallery/${id}/media`}
          alt={item.altText}
          className="mt-3 h-auto max-h-[36rem] max-w-full rounded-card object-contain"
        />
      </section>
      <section>
        <h2 className="text-heading font-bold">설명과 대체 텍스트</h2>
        <p className="mt-3 whitespace-pre-wrap break-words">{item.description}</p>
        <p className="mt-3 whitespace-pre-wrap break-words">
          <strong>대체 텍스트:</strong> {item.altText}
        </p>
      </section>
      <section>
        <h2 className="text-heading font-bold">상세 정보</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="font-semibold">{label}</dt>
              <dd className="break-all">{value ?? "미입력"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="grid gap-5" aria-labelledby="gallery-actions">
        <h2 id="gallery-actions" className="text-heading font-bold">
          상태 변경
        </h2>
        {item.canRequestReview && canRequestReview ? (
          <AdminGalleryReviewForm id={id} expectedUpdatedAt={item.updatedAt} />
        ) : null}
        {item.canDecideReview && canDecideReview ? (
          <AdminGalleryReviewDecisionForm id={id} expectedUpdatedAt={item.updatedAt} />
        ) : null}
        {item.canPublish && canPublish ? <AdminGalleryPublishForm id={id} expectedUpdatedAt={item.updatedAt} /> : null}
        {item.canManagePublicationState && canPublish ? (
          <AdminGalleryPublicationStateForm id={id} expectedUpdatedAt={item.updatedAt} />
        ) : null}
        {item.canWithdrawConsent && canWithdrawConsent ? (
          <AdminGalleryConsentWithdrawalForm id={id} expectedUpdatedAt={item.updatedAt} />
        ) : null}
      </section>
      {item.isArchivable && canArchive ? (
        <section className="rounded-card border p-5">
          <h2 className="text-heading font-bold">초안 보관</h2>
          <AdminGalleryArchiveForm id={id} expectedUpdatedAt={item.updatedAt} />
        </section>
      ) : null}
      {canDelete ? (
        <section aria-labelledby="delete-content-heading" className="rounded-card border-2 border-foreground p-5">
          <h2 id="delete-content-heading" className="text-heading font-bold">
            위험 영역: 콘텐츠 삭제
          </h2>
          <AdminContentDeleteForm
            id={item.id}
            title={item.title}
            endpoint={`/api/admin/gallery/${item.id}/delete`}
            expectedUpdatedAt={item.updatedAt}
          />
        </section>
      ) : null}
      <AdminAuditHistory items={auditHistory} />
    </div>
  );
}
