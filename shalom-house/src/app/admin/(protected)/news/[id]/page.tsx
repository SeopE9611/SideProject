import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNewsReviewRequestForm } from "@/components/admin/admin-news-review-request-form";
import { AdminNewsReviewDecisionForm } from "@/components/admin/admin-news-review-decision-form";
import { AdminNewsPublishForm } from "@/components/admin/admin-news-publish-form";
import { findAdminNewsPostById } from "@/features/news/news.admin-repository";
import {
  getNewsApprovalStatusLabel,
  getNewsCategoryLabel,
  getNewsPublicationStatusLabel,
} from "@/features/news/news.types";

export const metadata: Metadata = {
  title: "뉴스 상세 관리",
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
  return value ? (
    <time dateTime={value}>{dateFormatter.format(new Date(value))}</time>
  ) : (
    <>게시일 미설정</>
  );
}

export default async function AdminNewsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    updated?: string | string[];
    reviewRequested?: string | string[];
    decision?: string | string[];
    published?: string | string[];
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const post = await findAdminNewsPostById(id);
  if (!post) notFound();
  const wasUpdated = typeof query.updated === "string" && query.updated === "1";
  const wasReviewRequested =
    typeof query.reviewRequested === "string" &&
    query.reviewRequested === "1";
  const isPendingReview =
    post.publicationStatus === "review" && post.approvalStatus === "pending";
  const isApprovedReview =
    post.publicationStatus === "review" &&
    post.approvalStatus === "approved" &&
    post.publishedAt === null;
  const isRejectedDraft =
    post.publicationStatus === "draft" &&
    post.approvalStatus === "rejected" &&
    post.publishedAt === null;
  const decision = typeof query.decision === "string" ? query.decision : null;
  const wasPublished =
    typeof query.published === "string" && query.published === "1";

  const details = [
    ["게시 상태", getNewsPublicationStatusLabel(post.publicationStatus)],
    ["승인 상태", getNewsApprovalStatusLabel(post.approvalStatus)],
    ["공개 여부", post.isPubliclyVisible ? "공개 중" : "비공개"],
    ["slug", post.slug],
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/news" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          ← 뉴스 관리로 돌아가기
        </Link>
        <p className="mt-4 text-small font-semibold text-primary">{getNewsCategoryLabel(post.category)}</p>
        <h1 className="mt-1 text-title font-bold">게시물 상세 관리</h1>
        <p className="mt-3 break-words text-heading font-bold">{post.title}</p>
      </header>

      {wasUpdated ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          게시물 내용을 수정했습니다.
        </p>
      ) : null}

      {wasReviewRequested ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          게시물을 검토 중 상태로 전환했습니다.
        </p>
      ) : null}

      {decision === "approved" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          게시물 검토를 승인했습니다. 아직 공개되지는 않았습니다.
        </p>
      ) : null}

      {decision === "rejected" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          게시물을 반려해 수정 가능한 초안으로 되돌렸습니다.
        </p>
      ) : null}

      {wasPublished ? (
        <div role="status" className="rounded-control border border-border-strong bg-surface p-4">
          <p className="font-semibold">게시물을 공개했습니다.</p>
          <p className="mt-2 text-small text-muted-foreground">공개 뉴스 목록과 상세 페이지에서 확인할 수 있습니다.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {post.isEditable ? (
          <Link href={`/admin/news/${post.id}/edit`} className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
            게시물 수정
          </Link>
        ) : null}
        {post.isPubliclyVisible ? (
          <Link href={`/news/${post.slug}`} className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
            공개 페이지 보기
          </Link>
        ) : null}
      </div>

      {!post.isEditable ? (
        <aside className="rounded-card border border-border-strong bg-surface p-5">
          {isPendingReview ? (
            <>
              <p className="font-semibold">검토 요청된 게시물입니다.</p>
              <p className="mt-2 text-small text-muted-foreground">검토 중에는 내용 수정이 잠겨 있습니다.</p>
            </>
          ) : isApprovedReview ? (
            <>
              <p className="font-semibold">검토 승인이 완료된 게시물입니다.</p>
              <p className="mt-2 text-small text-muted-foreground">최종 공개 내용을 확인한 뒤 아래 게시 절차를 진행해 주세요.</p>
            </>
          ) : post.isPubliclyVisible ? (
            <>
              <p className="font-semibold">현재 홈페이지에 공개 중인 게시물입니다.</p>
              <p className="mt-2 text-small text-muted-foreground">게시 중단과 보관 기능은 다음 작업에서 연결합니다.</p>
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
          <p className="font-semibold">검토 결과 반려된 게시물입니다.</p>
          <p className="mt-2 text-small text-muted-foreground">내용을 수정한 뒤 다시 검토를 요청할 수 있습니다.</p>
        </aside>
      ) : null}

      <section aria-labelledby="admin-news-status-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="admin-news-status-heading" className="text-heading font-bold">상태 정보</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-small font-semibold text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all">{value}</dd>
            </div>
          ))}
          <div><dt className="text-small font-semibold text-muted-foreground">게시일</dt><dd className="mt-1"><DateValue value={post.publishedAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">생성일</dt><dd className="mt-1"><DateValue value={post.createdAt} /></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">최근 수정일</dt><dd className="mt-1"><DateValue value={post.updatedAt} /></dd></div>
        </dl>
      </section>

      <section aria-labelledby="admin-news-content-heading" className="space-y-6">
        <h2 id="admin-news-content-heading" className="text-heading font-bold">내용</h2>
        <div><h3 className="font-bold">요약</h3><p className="mt-2 whitespace-pre-wrap break-words">{post.summary}</p></div>
        <div><h3 className="font-bold">본문</h3><div className="mt-2 space-y-4">{post.body.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap break-words">{paragraph}</p>)}</div></div>
      </section>

      {post.canRequestReview ? (
        <section aria-labelledby="admin-news-review-heading" className="rounded-card border border-border-strong bg-surface p-5">
          <h2 id="admin-news-review-heading" className="text-heading font-bold">{isRejectedDraft ? "재검토 요청" : "검토 요청"}</h2>
          {isRejectedDraft ? (
            <p className="mt-3 text-small text-muted-foreground">
              반려 사항을 반영한 뒤 다시 검토 중 상태로 전환합니다.<br />
              재검토 요청 시 승인 상태는 다시 승인 대기로 변경됩니다.
            </p>
          ) : (
            <p className="mt-3 text-small text-muted-foreground">
              검토 요청 후 게시 상태가 검토 중으로 변경되며 내용 수정이 잠깁니다.<br />
              이 작업만으로 게시물이 승인되거나 공개되지는 않습니다.
            </p>
          )}
          <AdminNewsReviewRequestForm
            postId={post.id}
            expectedUpdatedAt={post.updatedAt}
          />
        </section>
      ) : null}

      {post.canDecideReview ? (
        <section aria-labelledby="admin-news-decision-heading" className="rounded-card border border-border-strong bg-surface p-5">
          <h2 id="admin-news-decision-heading" className="text-heading font-bold">검토 결과 처리</h2>
          <p className="mt-3 text-small text-muted-foreground">
            승인은 검토 완료 상태만 기록하며 게시물을 공개하지 않습니다.<br />
            반려하면 수정 가능한 초안으로 돌아가며 다시 검토를 요청할 수 있습니다.
          </p>
          <AdminNewsReviewDecisionForm postId={post.id} expectedUpdatedAt={post.updatedAt} />
        </section>
      ) : null}

      {post.canPublish ? (
        <section aria-labelledby="admin-news-publish-heading" className="rounded-card border border-border-strong bg-surface p-5">
          <h2 id="admin-news-publish-heading" className="text-heading font-bold">게시</h2>
          <p className="mt-3 text-small text-muted-foreground">
            게시하면 현재 승인된 내용이 즉시 공개 뉴스 목록과 상세 페이지에 표시됩니다.<br />
            게시 후 내용 수정과 게시 중단은 별도 상태 전환이 필요합니다.
          </p>
          <AdminNewsPublishForm postId={post.id} expectedUpdatedAt={post.updatedAt} />
        </section>
      ) : null}
    </div>
  );
}
