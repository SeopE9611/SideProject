"use client";

import PhotosReorderGrid from "@/components/reviews/PhotosReorderGrid";
import PhotosUploader from "@/components/reviews/PhotosUploader";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REVIEW_CONTENT_MAX_LENGTH,
  REVIEW_MAX_PHOTOS,
  validateReviewInput,
} from "@/lib/reviews/review-input-policy";
import { Star } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

type EditForm = {
  rating: number | "";
  content: string;
  photos: string[];
};

type Props = {
  open: boolean;
  editForm: EditForm;
  hoverRating: number | null;
  onClose: () => void;
  onSubmit: () => void;
  busy?: boolean;
  uploadingPhotos?: boolean;
  onUploadingPhotosChange?: (uploading: boolean) => void;
  uploadSessionId: string | null;
  onUploaded: (urls: string[], uploadSessionId: string) => void;
  onRemove: (url: string, uploadSessionId: string) => void;
  onChangeForm: Dispatch<SetStateAction<EditForm>>;
  onChangeHoverRating: Dispatch<SetStateAction<number | null>>;
};

export default function ReviewEditDialog({
  open,
  editForm,
  hoverRating,
  onClose,
  onSubmit,
  onChangeForm,
  onChangeHoverRating,
  busy = false,
  uploadingPhotos = false,
  onUploadingPhotosChange,
  uploadSessionId,
  onUploaded,
  onRemove,
}: Props) {
  const isValid = validateReviewInput(editForm).ok;
  return (
    <Dialog open={open} onOpenChange={(v) => (v || uploadingPhotos ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>후기 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>평점</Label>

            <div
              role="radiogroup"
              aria-label="평점 선택"
              className="flex items-center gap-1"
              onKeyDown={(e) => {
                const curr = typeof editForm.rating === "number" ? editForm.rating : 0;
                if (e.key === "ArrowRight") {
                  const next = Math.min(5, curr + 1 || 1);
                  onChangeForm((s) => ({ ...s, rating: next }));
                  e.preventDefault();
                }
                if (e.key === "ArrowLeft") {
                  const next = Math.max(1, (curr || 1) - 1);
                  onChangeForm((s) => ({ ...s, rating: next }));
                  e.preventDefault();
                }
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => {
                const current = typeof editForm.rating === "number" ? editForm.rating : 0;
                const filled = (hoverRating ?? current) >= i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={current === i}
                    aria-label={`${i}점`}
                    className="p-1"
                    onMouseEnter={() => onChangeHoverRating(i)}
                    onMouseLeave={() => onChangeHoverRating(null)}
                    onClick={() => onChangeForm((s) => ({ ...s, rating: i }))}
                  >
                    <Star
                      className={`h-6 w-6 ${filled ? "text-warning fill-current stroke-current" : "fill-transparent text-muted-foreground stroke-current"}`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-ui-body-sm text-muted-foreground">
                {typeof editForm.rating === "number" ? editForm.rating : 0}/5
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">내용</Label>
            <Textarea
              id="content"
              rows={6}
              value={editForm.content}
              onChange={(e) => onChangeForm((s) => ({ ...s, content: e.target.value }))}
              placeholder="후기 내용을 입력하세요."
              maxLength={REVIEW_CONTENT_MAX_LENGTH}
            />
            <p className="text-right text-ui-body-xs text-muted-foreground">
              {editForm.content.trim().length} / {REVIEW_CONTENT_MAX_LENGTH}자
            </p>
            <div className="mt-3">
              <Label>사진 (선택, 최대 {REVIEW_MAX_PHOTOS}장)</Label>
              <PhotosUploader
                value={editForm.photos}
                onChange={(arr) => onChangeForm((s) => ({ ...s, photos: arr }))}
                max={REVIEW_MAX_PHOTOS}
                previewMode="queue"
                onUploadingChange={onUploadingPhotosChange}
                uploadSessionId={uploadSessionId}
                onUploaded={onUploaded}
                onRemove={onRemove}
                disabled={busy || uploadingPhotos || !uploadSessionId}
              />
              <PhotosReorderGrid
                value={editForm.photos}
                onChange={(arr) => onChangeForm((s) => ({ ...s, photos: arr }))}
                disabled={busy || uploadingPhotos}
                onRemove={(url) => {
                  if (!uploadSessionId) return;
                  void onRemove(url, uploadSessionId);
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md border text-ui-body-sm"
            onClick={onClose}
            disabled={busy || uploadingPhotos}
            aria-disabled={busy || uploadingPhotos}
          >
            취소
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-ui-body-sm"
            onClick={onSubmit}
            disabled={busy || uploadingPhotos || !isValid}
            aria-disabled={busy || uploadingPhotos || !isValid}
          >
            {busy ? "저장 중…" : uploadingPhotos ? "사진 업로드 중…" : "저장"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
