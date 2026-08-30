"use client";

import { AdminGalleryTransitionForm } from "./admin-gallery-review-form";

export function AdminGalleryReviewDecisionForm(p: {
  id: string;
  expectedUpdatedAt: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AdminGalleryTransitionForm
        {...p}
        endpoint="decision"
        label="승인"
        description="검토한 사진의 공개 준비를 승인합니다."
        confirmationField="confirmed"
        extra={{ decision: "approve" }}
      />
      <AdminGalleryTransitionForm
        {...p}
        endpoint="decision"
        label="반려"
        description="초안으로 돌려보내 수정을 요청합니다."
        confirmationField="confirmed"
        extra={{ decision: "reject" }}
      />
    </div>
  );
}
