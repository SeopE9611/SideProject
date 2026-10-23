"use client";

import { AdminGalleryTransitionForm } from "./admin-gallery-review-form";

export function AdminGalleryPublicationStateForm(p: { id: string; expectedUpdatedAt: string }) {
  return (
    <AdminGalleryTransitionForm
      {...p}
      endpoint="publication"
      label="게시 중단"
      description="업로드한 원본 파일은 삭제하지 않고 홈페이지 공개만 즉시 중단합니다."
      confirmationField="confirmed"
      extra={{ action: "unpublish" }}
    />
  );
}
