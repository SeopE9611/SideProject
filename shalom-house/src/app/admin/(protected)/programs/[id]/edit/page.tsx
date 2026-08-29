import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminProgramDraftForm } from "@/components/admin/admin-program-draft-form";
import { findAdminProgramPostById } from "@/features/programs/program.admin-repository";
import { getProgramPublicationStatusLabel } from "@/features/programs/program.types";

export const metadata: Metadata = {
  title: "프로그램 수정",
  robots: { index: false, follow: false },
};

export default async function AdminProgramEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await findAdminProgramPostById(id);
  if (!post) notFound();
  const isPendingReview =
    post.publicationStatus === "review" && post.approvalStatus === "pending";
  const isRejectedDraft =
    post.publicationStatus === "draft" && post.approvalStatus === "rejected";

  return (
    <div className="space-y-8">
      <header>
        <Link href={`/admin/programs/${post.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          ← 프로그램 상세로 돌아가기
        </Link>
        <h1 className="mt-4 text-title font-bold">프로그램 수정</h1>
        <p className="mt-3 text-body text-muted-foreground">
          현재 게시 상태는 {getProgramPublicationStatusLabel(post.publicationStatus)}이며, 저장 후에도 자동 공개되지 않습니다.
        </p>
      </header>

      {!post.isEditable ? (
        <aside className="rounded-card border border-border-strong bg-surface p-5">
          {isPendingReview ? (
            <>
              <p className="font-semibold">검토 중인 프로그램은 내용을 수정할 수 없습니다.</p>
              <p className="mt-2 text-small text-muted-foreground">상세 화면에서 검토 결과를 처리해 주세요.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">현재 게시 상태에서는 내용을 수정할 수 없습니다.</p>
              <p className="mt-2 text-small text-muted-foreground">상태 전환 기능은 후속 작업에서 연결합니다.</p>
            </>
          )}
          <Link href={`/admin/programs/${post.id}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">프로그램 상세 보기</Link>
        </aside>
      ) : (
        <>
          {isRejectedDraft ? (
            <aside className="max-w-3xl rounded-card border border-border-strong bg-surface p-5">
              <p className="font-semibold">이 프로그램은 검토에서 반려됐습니다.</p>
              <p className="mt-2 text-small text-muted-foreground">내용을 수정해 저장한 뒤 상세 화면에서 재검토를 요청해 주세요.</p>
            </aside>
          ) : null}
          <aside aria-labelledby="admin-program-edit-safety-heading" className="max-w-3xl rounded-card border border-border-strong bg-surface p-5">
            <h2 id="admin-program-edit-safety-heading" className="text-heading font-bold">저장 전 안전 확인</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-small">
              <li>개인정보·민감정보·내부 행정자료 저장 금지</li>
              <li>공개 권한이 확인되지 않은 정보 저장 금지</li>
              <li>저장 후에도 자동 공개되지 않음</li>
            </ul>
          </aside>
          <section aria-labelledby="admin-program-edit-form-heading">
            <h2 id="admin-program-edit-form-heading" className="sr-only">프로그램 초안 수정</h2>
            <AdminProgramDraftForm
              mode="edit"
              programId={post.id}
              expectedUpdatedAt={post.updatedAt}
              initialValue={{
                category: post.category,
                slug: post.slug,
                title: post.title,
                summary: post.summary,
                purpose: post.purpose,
          body: post.body.join("\n\n"),
          operationStatusLabel: post.operationStatusLabel ?? "",
          sortOrder: post.sortOrder,
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
