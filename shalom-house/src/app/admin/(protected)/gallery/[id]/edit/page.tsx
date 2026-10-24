import { AdminGalleryStateGuidance } from "@/components/admin/admin-gallery-state-guidance";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { notFound, redirect } from "next/navigation";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminGalleryDraftForm } from "@/components/admin/admin-gallery-draft-form";
import { findAdminGalleryItemById } from "@/features/gallery/gallery.admin-repository";
export default async function EditGallery({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params,
    item = await findAdminGalleryItemById(id);
  if (!item) notFound();
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.update")) redirect("/admin?forbidden=1");
  const editable = item.isEditable;
  return (
    <div className="admin-editor-layout">
      <AdminFormPageHeader
        backHref={`/admin/gallery/${id}`}
        backLabel="활동사진 상세로 돌아가기"
        eyebrow="활동사진 · 수정"
        title="활동사진 정보 수정"
      />
      {editable ? (
        <section aria-labelledby="admin-gallery-edit-form-heading">
          <h2 id="admin-gallery-edit-form-heading" className="sr-only">
            활동사진 정보 수정
          </h2>
          <AdminGalleryDraftForm
            mode="edit"
            galleryItemId={id}
            expectedUpdatedAt={item.updatedAt}
            initialValue={{
              slug: item.slug,
              title: item.title,
              category: item.category,
              description: item.description,
              altText: item.altText,
              activityDate: item.activityDate,
              subjectPresence: item.subjectPresence,
              consentStatus: item.consentStatus,
              consentCheckedOn: item.consentCheckedOn ?? "",
              consentReferenceCode: item.consentReferenceCode ?? "",
              displayStartOn: item.displayStartOn ?? "",
              displayEndOn: item.displayEndOn ?? "",
            }}
          />
        </section>
      ) : (
        <AdminGalleryStateGuidance
          state={item}
          canUpdate={hasAdminPermission(admin, "content.update")}
          canPublish={hasAdminPermission(admin, "content.publish")}
          canDecideReview={hasAdminPermission(admin, "content.decide_review")}
          detailHref={`/admin/gallery/${id}`}
        />
      )}
    </div>
  );
}
