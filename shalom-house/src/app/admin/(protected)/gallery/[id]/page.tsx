import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
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
export default async function GalleryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    item = await findAdminGalleryItemById(id);
  if (!item) notFound();
  const admin = await getCurrentAdmin();
  const canUpdate = Boolean(admin && hasAdminPermission(admin, "content.update"));
  const canRequestReview = Boolean(admin && hasAdminPermission(admin, "content.request_review"));
  const canDecideReview = Boolean(admin && hasAdminPermission(admin, "content.decide_review"));
  const canPublish = Boolean(admin && hasAdminPermission(admin, "content.publish"));
  const canArchive = Boolean(admin && hasAdminPermission(admin, "content.archive"));
  const canWithdrawConsent = Boolean(admin && hasAdminPermission(admin, "gallery.withdraw_consent"));
  const auditHistory = await listAdminGalleryAuditHistory({ contentId: item.id });
  const details: [
    [string, string | number | null],
    ...Array<[string, string | number | null]>,
  ] = [
    ["슬러그", item.slug],
    ["분류", item.category],
    ["활동일", item.activityDate],
    ["인물 상태", getGallerySubjectPresenceLabel(item.subjectPresence)],
    ["동의 상태", getGalleryConsentStatusLabel(item.consentStatus)],
    ["동의 확인일", item.consentCheckedOn],
    ["동의 참조 코드", item.consentReferenceCode],
    ["게시 시작일", item.displayStartOn],
    ["게시 종료일", item.displayEndOn],
    ["bucket", item.media.bucket],
    ["object path", item.media.objectPath],
    ["MIME", item.media.mimeType],
    ["용량", `${item.media.byteSize.toLocaleString()} bytes`],
    ["크기", `${item.media.width}×${item.media.height}`],
    ["원본 파일명", item.media.originalFileName],
    ["SHA-256", `${item.media.sha256.slice(0, 12)}…`],
    ["게시 상태", getGalleryPublicationStatusLabel(item.publicationStatus)],
    ["승인 상태", getGalleryApprovalStatusLabel(item.approvalStatus)],
    ["생성일", item.createdAt],
    ["수정일", item.updatedAt],
  ];
  const editable = item.isEditable && canUpdate;
  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/gallery" className="font-semibold underline">
          ← 활동사진 관리로 돌아가기
        </Link>
        <h1 className="mt-4 text-title font-bold">{item.title}</h1>
        {editable ? (
          <Link
            href={`/admin/gallery/${id}/edit`}
            className="mt-3 inline-flex min-h-11 items-center underline"
          >
            메타데이터 수정
          </Link>
        ) : null}
      </header>
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
        <p className="mt-3 whitespace-pre-wrap break-words">
          {item.description}
        </p>
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
          <AdminGalleryReviewForm
            id={id}
            expectedUpdatedAt={item.updatedAt}
          />
        ) : null}
        {item.canDecideReview && canDecideReview ? (
          <AdminGalleryReviewDecisionForm
            id={id}
            expectedUpdatedAt={item.updatedAt}
          />
        ) : null}
        {item.canPublish && canPublish ? (
          <AdminGalleryPublishForm
            id={id}
            expectedUpdatedAt={item.updatedAt}
          />
        ) : null}
        {item.canManagePublicationState && canPublish ? (
          <AdminGalleryPublicationStateForm
            id={id}
            expectedUpdatedAt={item.updatedAt}
          />
        ) : null}
        {item.canWithdrawConsent && canWithdrawConsent ? (
          <AdminGalleryConsentWithdrawalForm
            id={id}
            expectedUpdatedAt={item.updatedAt}
          />
        ) : null}
        <p>
          <strong>현재 공개 여부:</strong>{" "}
          {item.isPubliclyVisible ? (
            <>
              공개 중 ·{" "}
              <Link
                className="underline"
                href={`/life/gallery/${item.slug}`}
              >
                공개 상세 보기
              </Link>
            </>
          ) : (
            "공개되지 않음"
          )}
        </p>
      </section>
      {editable ? (
        <section className="rounded-card border p-5">
          <h2 className="text-heading font-bold">초안 보관</h2>
          <AdminGalleryArchiveForm id={id} expectedUpdatedAt={item.updatedAt} />
        </section>
      ) : null}
      <AdminAuditHistory items={auditHistory} />
    </div>
  );
}
