import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminContentDeleteForm } from "@/components/admin/admin-content-delete-form";
import { AdminDirectPublishForm } from "@/components/admin/admin-direct-publish-form";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminProgramPublicationStateForm } from "@/components/admin/admin-program-publication-state-form";
import { AdminProgramPublishForm } from "@/components/admin/admin-program-publish-form";
import { AdminProgramReviewDecisionForm } from "@/components/admin/admin-program-review-decision-form";
import { AdminProgramMediaForm } from "@/components/admin/admin-program-media-form";
import { listAdminPublicGalleryCoverOptions } from "@/features/gallery/gallery.admin-repository";
import { findPublicGalleryCoverById } from "@/features/gallery/gallery.repository";
import { ObjectId } from "mongodb";
import { AdminProgramReviewRequestForm } from "@/components/admin/admin-program-review-request-form";
import { findAdminProgramPostById } from "@/features/programs/program.admin-repository";
import { listAdminProgramAuditHistory } from "@/features/programs/program.audit-repository";
import {
  getProgramApprovalStatusLabel,
  getProgramCategoryLabel,
  getProgramPublicationStatusLabel,
} from "@/features/programs/program.types";

export const metadata: Metadata = {
  title: "프로그램 상세 관리",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function DateValue({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{dateFormatter.format(new Date(value))}</time> : <>게시일 미설정</>;
}

export default async function AdminProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    updated?: string | string[];
    reviewRequested?: string | string[];
    decision?: string | string[];
    published?: string | string[];
    directPublished?: string | string[];
    publication?: string | string[];
    mediaUpdated?: string | string[];
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const post = await findAdminProgramPostById(id);
  if (!post) notFound();
  const admin = await getCurrentAdmin();
  const canUpdate = Boolean(admin && hasAdminPermission(admin, "content.update"));
  const canDelete = Boolean(admin && hasAdminPermission(admin, "content.delete"));
  const canRequestReview = Boolean(admin && hasAdminPermission(admin, "content.request_review"));
  const canDecideReview = Boolean(admin && hasAdminPermission(admin, "content.decide_review"));
  const canPublish = Boolean(admin && hasAdminPermission(admin, "content.publish"));
  const canDirectPublish = Boolean(admin && hasAdminPermission(admin, "content.direct_publish"));
  const auditHistory = await listAdminProgramAuditHistory({ contentId: post.id });
  const coverOptions = await listAdminPublicGalleryCoverOptions();
  const publicCover = post.coverGalleryItemId ? await findPublicGalleryCoverById(new ObjectId(post.coverGalleryItemId)) : null;
  const wasUpdated = typeof query.updated === "string" && query.updated === "1";
  const wasReviewRequested = typeof query.reviewRequested === "string" && query.reviewRequested === "1";
  const isPendingReview = post.publicationStatus === "review" && post.approvalStatus === "pending";
  const isApprovedReview =
    post.publicationStatus === "review" && post.approvalStatus === "approved" && post.publishedAt === null;
  const isRejectedDraft =
    post.publicationStatus === "draft" && post.approvalStatus === "rejected" && post.publishedAt === null;
  const decision = typeof query.decision === "string" ? query.decision : null;
  const wasPublished = typeof query.published === "string" && query.published === "1";
  const wasDirectPublished = typeof query.directPublished === "string" && query.directPublished === "1";
  const publication = typeof query.publication === "string" ? query.publication : null;
  const isArchived = post.publicationStatus === "archived" && post.approvalStatus === "approved";
  const wasMediaUpdated = query.mediaUpdated === "1";

  const details = [
    ["게시 상태", getProgramPublicationStatusLabel(post.publicationStatus)],
    ["승인 상태", getProgramApprovalStatusLabel(post.approvalStatus)],
    ["공개 여부", post.isPubliclyVisible ? "공개 중" : "비공개"],
    ["slug", post.slug],
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin/programs"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          ← 프로그램 관리로 돌아가기
        </Link>
        <p className="mt-4 text-small font-semibold text-primary">{getProgramCategoryLabel(post.category)}</p>
        <h1 className="mt-1 text-title font-bold">프로그램 상세 관리</h1>
        <p className="mt-3 break-words text-heading font-bold">{post.title}</p>
      </header>

      {wasMediaUpdated ? <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">대표 이미지 또는 첨부파일을 저장했습니다.</p> : null}

      {wasUpdated ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          프로그램 내용을 수정했습니다.
        </p>
      ) : null}

      {wasReviewRequested ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          프로그램을 검토 중 상태로 전환했습니다.
        </p>
      ) : null}

      {decision === "approved" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          프로그램 검토를 승인했습니다. 아직 공개되지는 않았습니다.
        </p>
      ) : null}

      {decision === "rejected" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          프로그램을 반려해 수정 가능한 초안으로 되돌렸습니다.
        </p>
      ) : null}

      {wasDirectPublished ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          프로그램을 승인과 동시에 바로 공개했습니다.
        </p>
      ) : null}

      {wasPublished ? (
        <div role="status" className="rounded-control border border-border-strong bg-surface p-4">
          <p className="font-semibold">프로그램을 공개했습니다.</p>
          <p className="mt-2 text-small text-muted-foreground">
            공개 프로그램 목록과 상세 페이지에서 확인할 수 있습니다.
          </p>
        </div>
      ) : null}

      {publication === "unpublished" ? (
        <div role="status" className="rounded-control border border-border-strong bg-surface p-4">
          <p className="font-semibold">게시를 중단했습니다.</p>
          <p className="mt-2 text-small text-muted-foreground">
            공개 프로그램 목록과 상세 페이지에서 더 이상 표시되지 않습니다.
          </p>
        </div>
      ) : null}

      {publication === "archived" ? (
        <div role="status" className="rounded-control border border-border-strong bg-surface p-4">
          <p className="font-semibold">프로그램을 보관 상태로 전환했습니다.</p>
          <p className="mt-2 text-small text-muted-foreground">
            공개 프로그램 목록과 상세 페이지에서 더 이상 표시되지 않습니다.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {post.isEditable && canUpdate ? (
          <Link
            href={`/admin/programs/${post.id}/edit`}
            className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            프로그램 수정
          </Link>
        ) : null}
        {post.isPubliclyVisible ? (
          <Link
            href={`/life/programs/${post.slug}`}
            className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            공개 페이지 보기
          </Link>
        ) : null}
      </div>

      {!post.isEditable ? (
        <aside className="rounded-card border border-border-strong bg-surface p-5">
          {isPendingReview ? (
            <>
              <p className="font-semibold">검토 요청된 프로그램입니다.</p>
              <p className="mt-2 text-small text-muted-foreground">검토 중에는 내용 수정이 잠겨 있습니다.</p>
            </>
          ) : isApprovedReview ? (
            <>
              <p className="font-semibold">검토 승인이 완료된 프로그램입니다.</p>
              <p className="mt-2 text-small text-muted-foreground">
                최종 공개 내용을 확인한 뒤 아래 게시 절차를 진행해 주세요.
              </p>
            </>
          ) : post.canManagePublicationState ? (
            <>
              <p className="font-semibold">현재 홈페이지에 공개 중인 프로그램입니다.</p>
              <p className="mt-2 text-small text-muted-foreground">
                아래에서 게시 중단 또는 보관을 선택할 수 있습니다.
              </p>
            </>
          ) : isArchived ? (
            <>
              <p className="font-semibold">보관된 프로그램입니다.</p>
              <p className="mt-2 text-small text-muted-foreground">
                공개 목록과 상세 페이지에는 표시되지 않으며 현재는 보관 해제나 재게시를 지원하지 않습니다.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">현재 게시 상태에서는 내용을 수정할 수 없습니다.</p>
              <p className="mt-2 text-small text-muted-foreground">상태 전환 기능은 후속 작업에서 연결합니다.</p>
            </>
          )}
        </aside>
      ) : null}

      {isRejectedDraft ? (
        <aside className="rounded-card border border-border-strong bg-surface p-5">
          <p className="font-semibold">검토 결과 반려된 프로그램입니다.</p>
          <p className="mt-2 text-small text-muted-foreground">내용을 수정한 뒤 다시 검토를 요청할 수 있습니다.</p>
        </aside>
      ) : null}

      <section
        aria-labelledby="admin-program-status-heading"
        className="rounded-card border border-border bg-surface p-5"
      >
        <h2 id="admin-program-status-heading" className="text-heading font-bold">
          상태 정보
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-small font-semibold text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-small font-semibold text-muted-foreground">게시일</dt>
            <dd className="mt-1">
              <DateValue value={post.publishedAt} />
            </dd>
          </div>
          <div>
            <dt className="text-small font-semibold text-muted-foreground">생성일</dt>
            <dd className="mt-1">
              <DateValue value={post.createdAt} />
            </dd>
          </div>
          <div>
            <dt className="text-small font-semibold text-muted-foreground">최근 수정일</dt>
            <dd className="mt-1">
              <DateValue value={post.updatedAt} />
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="admin-program-content-heading" className="space-y-6">
        <h2 id="admin-program-content-heading" className="text-heading font-bold">
          내용
        </h2>
        <div>
          <h3 className="font-bold">목적</h3>
          <p className="mt-2 whitespace-pre-wrap break-words">{post.purpose}</p>
        </div>
        <div>
          <h3 className="font-bold">운영 상태</h3>
          <p className="mt-2">{post.operationStatusLabel ?? "미입력"}</p>
        </div>
        <div>
          <h3 className="font-bold">정렬 순서</h3>
          <p className="mt-2">{post.sortOrder}</p>
        </div>
        <div>
          <h3 className="font-bold">요약</h3>
          <p className="mt-2 whitespace-pre-wrap break-words">{post.summary}</p>
        </div>
        <div>
          <h3 className="font-bold">본문</h3>
          <div className="mt-2 space-y-4">
            {post.body.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-wrap break-words">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <AdminProgramMediaForm programId={post.id} expectedUpdatedAt={post.updatedAt} editable={post.isEditable && canUpdate}
        currentCover={post.coverGalleryItemId ? { id: post.coverGalleryItemId, title: publicCover?.title ?? "공개 불가 활동사진",
          altText: publicCover?.altText ?? "", mediaUrl: publicCover?.mediaUrl ?? "", publiclyAvailable: Boolean(publicCover) } : null}
        coverOptions={coverOptions} currentAttachment={post.attachment ? { label: post.attachment.label, originalFileName: post.attachment.originalFileName,
          byteSize: post.attachment.byteSize, downloadUrl: `/api/admin/programs/${post.id}/attachment` } : null} />

      {post.canDirectPublish && canDirectPublish ? (
        <section
          aria-labelledby="admin-program-direct-publish-heading"
          className="rounded-card border border-border-strong bg-surface p-5"
        >
          <h2 id="admin-program-direct-publish-heading" className="text-heading font-bold">
            바로 게시
          </h2>
          <p className="mt-3 text-small text-muted-foreground">
            시스템 관리자는 별도의 검토·승인 단계를 거치지 않고 현재 프로그램을 즉시 공개할 수 있습니다.
            <br />
            역할을 나눠 검토하려면 아래의 검토 요청 절차를 사용해 주세요.
          </p>
          <AdminDirectPublishForm
            id={post.id}
            endpoint={`/api/admin/programs/${post.id}/direct-publish`}
            expectedUpdatedAt={post.updatedAt}
            contentLabel="프로그램"
          />
        </section>
      ) : null}

      {post.canRequestReview && canRequestReview ? (
        <section
          aria-labelledby="admin-program-review-heading"
          className="rounded-card border border-border-strong bg-surface p-5"
        >
          <h2 id="admin-program-review-heading" className="text-heading font-bold">
            {isRejectedDraft ? "재검토 요청" : "검토 요청"}
          </h2>
          {isRejectedDraft ? (
            <p className="mt-3 text-small text-muted-foreground">
              반려 사항을 반영한 뒤 다시 검토 중 상태로 전환합니다.
              <br />
              재검토 요청 시 승인 상태는 다시 승인 대기로 변경됩니다.
            </p>
          ) : (
            <p className="mt-3 text-small text-muted-foreground">
              검토 요청 후 게시 상태가 검토 중으로 변경되며 내용 수정이 잠깁니다.
              <br />이 작업만으로 프로그램이 승인되거나 공개되지는 않습니다.
            </p>
          )}
          <AdminProgramReviewRequestForm postId={post.id} expectedUpdatedAt={post.updatedAt} />
        </section>
      ) : null}

      {post.canDecideReview && canDecideReview ? (
        <section
          aria-labelledby="admin-program-decision-heading"
          className="rounded-card border border-border-strong bg-surface p-5"
        >
          <h2 id="admin-program-decision-heading" className="text-heading font-bold">
            검토 결과 처리
          </h2>
          <p className="mt-3 text-small text-muted-foreground">
            승인은 검토 완료 상태만 기록하며 프로그램을 공개하지 않습니다.
            <br />
            반려하면 수정 가능한 초안으로 돌아가며 다시 검토를 요청할 수 있습니다.
          </p>
          <AdminProgramReviewDecisionForm postId={post.id} expectedUpdatedAt={post.updatedAt} />
        </section>
      ) : null}

      {post.canPublish && canPublish ? (
        <section
          aria-labelledby="admin-program-publish-heading"
          className="rounded-card border border-border-strong bg-surface p-5"
        >
          <h2 id="admin-program-publish-heading" className="text-heading font-bold">
            게시
          </h2>
          <p className="mt-3 text-small text-muted-foreground">
            게시하면 현재 승인된 내용이 즉시 공개 프로그램 목록과 상세 페이지에 표시됩니다.
            <br />
            게시 후 내용 수정과 게시 중단은 별도 상태 전환이 필요합니다.
          </p>
          <AdminProgramPublishForm postId={post.id} expectedUpdatedAt={post.updatedAt} />
        </section>
      ) : null}

      {post.canManagePublicationState && canPublish ? (
        <section
          aria-labelledby="admin-program-publication-state-heading"
          className="rounded-card border border-border-strong bg-surface p-5"
        >
          <h2 id="admin-program-publication-state-heading" className="text-heading font-bold">
            게시 상태 변경
          </h2>
          <p className="mt-3 text-small text-muted-foreground">
            게시 중단은 공개를 종료한 뒤 다시 게시할 수 있는 승인 완료 상태로 되돌립니다.
            <br />
            보관은 공개를 종료하고 현재 작업 범위에서 복구할 수 없는 보관 상태로 전환합니다.
          </p>
          <AdminProgramPublicationStateForm postId={post.id} expectedUpdatedAt={post.updatedAt} />
        </section>
      ) : null}
      {canDelete ? (
        <section aria-labelledby="delete-content-heading" className="rounded-card border-2 border-foreground p-5">
          <h2 id="delete-content-heading" className="text-heading font-bold">
            위험 영역: 콘텐츠 삭제
          </h2>
          <AdminContentDeleteForm
            id={post.id}
            title={post.title}
            endpoint={`/api/admin/programs/${post.id}/delete`}
            expectedUpdatedAt={post.updatedAt}
          />
        </section>
      ) : null}
      <AdminAuditHistory items={auditHistory} />
    </div>
  );
}
