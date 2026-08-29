import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminGalleryArchiveForm } from "@/components/admin/admin-gallery-archive-form";
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
  const editable =
    item.publicationStatus === "draft" &&
    (item.approvalStatus === "pending" || item.approvalStatus === "rejected") &&
    !item.archivedAt;
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
      {editable ? (
        <section className="rounded-card border p-5">
          <h2 className="text-heading font-bold">초안 보관</h2>
          <AdminGalleryArchiveForm id={id} expectedUpdatedAt={item.updatedAt} />
        </section>
      ) : null}
    </div>
  );
}
