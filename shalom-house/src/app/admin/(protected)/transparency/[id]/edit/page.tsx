import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminTransparencyDraftForm } from "@/components/admin/admin-transparency-draft-form";
import { findAdminTransparencyDocumentById } from "@/features/transparency/transparency.admin-repository";
export default async function EditTransparencyPage({ params }: { params: Promise<{ id: string }> }) {
  const document = await findAdminTransparencyDocumentById((await params).id);
  if (!document) notFound();
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.update")) redirect("/admin?forbidden=1");
  if (!document.isEditable) notFound();
  return <div className="min-w-0 space-y-8"><header><Link href={`/admin/transparency/${document.id}`} className="underline">← 상세로 돌아가기</Link><h1 className="mt-4 text-title font-bold">자료공개 초안 수정</h1><p>메타데이터만 수정하며 PDF는 교체하지 않습니다.</p></header><AdminTransparencyDraftForm mode="edit" id={document.id} initial={{ slug: document.slug, title: document.title, category: document.category, periodLabel: document.periodLabel, summary: document.summary, documentDate: document.documentDate, privacyReviewStatus: document.privacyReviewStatus, finalDocumentStatus: document.finalDocumentStatus, updatedAt: document.updatedAt }} /></div>;
}
