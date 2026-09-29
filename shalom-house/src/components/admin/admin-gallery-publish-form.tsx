"use client";

import { AdminGalleryTransitionForm } from "./admin-gallery-review-form";

export function AdminGalleryPublishForm(p: { id: string; expectedUpdatedAt: string }) {
  return (
    <AdminGalleryTransitionForm
      {...p}
      endpoint="publish"
      label="게시"
      description="승인과 동의 조건을 확인하고 홈페이지에 게시합니다."
      confirmationField="publishConfirmed"
    />
  );
}
