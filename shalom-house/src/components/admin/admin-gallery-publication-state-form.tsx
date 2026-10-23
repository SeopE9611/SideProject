"use client";

import { AdminGalleryTransitionForm } from "./admin-gallery-review-form";

export function AdminGalleryPublicationStateForm(p: { id: string; expectedUpdatedAt: string }) {
  return (
    <AdminGalleryTransitionForm
      {...p}
      endpoint="publication"
      label="게시 중단"
      description="게시를 중단하면 홈페이지에서 사진이 보이지 않게 되지만, 서버에 저장된 사진 파일은 삭제되지 않습니다."
      confirmationField="confirmed"
      extra={{ action: "unpublish" }}
    />
  );
}
