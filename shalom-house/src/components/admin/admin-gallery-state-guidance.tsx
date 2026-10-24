import Link from "next/link";
import {
  getGalleryApprovalStatusLabel,
  getGalleryPublicationStatusLabel,
  type GalleryApprovalStatus,
  type GalleryPublicationStatus,
} from "@/features/gallery/gallery.types";

type Props = {
  state: {
    publicationStatus: GalleryPublicationStatus;
    approvalStatus: GalleryApprovalStatus;
    isEditable: boolean;
    isPubliclyVisible: boolean;
    canPublish: boolean;
    canDecideReview: boolean;
  };
  canUpdate: boolean;
  canPublish: boolean;
  canDecideReview: boolean;
  detailHref?: string;
};

export function AdminGalleryStateGuidance({ state, canUpdate, canPublish, canDecideReview, detailHref }: Props) {
  let message: string;
  let actionLabel: string | null = null;
  if (state.publicationStatus === "draft" && state.isEditable) {
    message = state.approvalStatus === "rejected"
      ? "검토에서 반려된 초안입니다. 수정 이력을 확인하고 사진·설명과 공개 동의 정보를 다시 확인해 주세요."
      : "아직 검토를 요청하지 않은 초안입니다. 사진·설명과 공개 동의 정보를 확인해 주세요.";
    message += canUpdate ? " 내용을 수정할 수 있습니다." : " 내용 수정에는 수정 권한이 필요합니다.";
  } else if (state.publicationStatus === "review" && state.approvalStatus === "pending") {
    message = "검토 결과를 기다리는 상태입니다. 검토 요청 후에는 내용 수정이 제한됩니다.";
    if (state.canDecideReview && canDecideReview) actionLabel = "검토 작업 바로가기";
  } else if (state.publicationStatus === "review" && state.approvalStatus === "approved") {
    message = "검토 승인이 완료됐지만 아직 홈페이지에 게시되지 않았습니다. 승인 후에도 내용 수정은 제한됩니다.";
    if (!state.canPublish) {
      message += " 현재 게시 조건을 충족하지 않습니다. 인물 식별·공개 동의 정보와 동의 철회 여부를 확인해 주세요.";
    } else if (!canPublish) {
      message += " 게시 권한이 있는 관리자가 게시 작업을 진행해야 합니다.";
    } else {
      message += " 게시 전에 인물·공개 동의 정보와 게시 시작·종료일을 확인해 주세요.";
      actionLabel = "게시 작업 바로가기";
    }
  } else if (state.publicationStatus === "published") {
    message = state.isPubliclyVisible
      ? "현재 홈페이지에 공개 중입니다. 게시된 활동사진의 내용 수정은 제한됩니다."
      : "게시 상태이지만 현재 홈페이지에는 표시되지 않습니다. 내용 수정은 제한되며, 공개 동의·철회 여부와 게시 시작·종료일을 확인해 주세요.";
  } else if (state.publicationStatus === "archived") {
    message = "보관 상태에서는 내용을 수정하거나 게시할 수 없습니다. 상세 정보와 수정 이력을 확인해 주세요.";
  } else {
    message = "현재 상태에서는 내용 수정 조건을 충족하지 않습니다. 상세 정보와 수정 이력을 확인해 주세요.";
  }

  return (
    <aside className="admin-notice text-safe-wrap" aria-labelledby="admin-gallery-state-guide-heading">
      <h2 id="admin-gallery-state-guide-heading" className="font-bold">
        {getGalleryPublicationStatusLabel(state.publicationStatus)} · {getGalleryApprovalStatusLabel(state.approvalStatus)}
      </h2>
      <p className="mt-2 text-small">{message}</p>
      {detailHref ? (
        <Link href={detailHref} className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          활동사진 상세페이지로 돌아가기
        </Link>
      ) : actionLabel ? (
        <a href="#admin-gallery-workflow-heading" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          {actionLabel}
        </a>
      ) : null}
    </aside>
  );
}
