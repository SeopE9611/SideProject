import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { notFound, redirect } from "next/navigation";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminTransparencyDraftForm } from "@/components/admin/admin-transparency-draft-form";
import { findAdminTransparencyDocumentById } from "@/features/transparency/transparency.admin-repository";
export default async function EditTransparencyPage({ params }: { params: Promise<{ id: string }> }) {
  const document = await findAdminTransparencyDocumentById((await params).id);
  if (!document) notFound();
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.update")) redirect("/admin?forbidden=1");
  if (!document.isEditable) notFound();
  return (
    <div className="min-w-0 space-y-8">
      <AdminFormPageHeader
        backHref={`/admin/transparency/${document.id}`}
        backLabel="상세로 돌아가기"
        eyebrow="자료공개 · 수정"
        title="자료공개 초안 수정"
        description="메타데이터만 수정하며 PDF는 교체하지 않습니다."
      />
      <section aria-labelledby="admin-transparency-edit-form-heading">
        <h2 id="admin-transparency-edit-form-heading" className="sr-only">
          자료공개 초안 수정
        </h2>
        <AdminTransparencyDraftForm
          mode="edit"
          id={document.id}
          initial={{
            slug: document.slug,
            title: document.title,
            category: document.category,
            periodLabel: document.periodLabel,
            summary: document.summary,
            documentDate: document.documentDate,
            privacyReviewStatus: document.privacyReviewStatus,
            finalDocumentStatus: document.finalDocumentStatus,
            updatedAt: document.updatedAt,
          }}
        />
      </section>
    </div>
  );
}
