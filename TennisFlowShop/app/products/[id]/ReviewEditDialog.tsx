"use client";

import PhotosReorderGrid from "@/components/reviews/PhotosReorderGrid";
import PhotosUploader from "@/components/reviews/PhotosUploader";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-[calc(100%-2rem)] bp-md:max-w-2xl [&>button:first-child]:inline-flex [&>button:first-child]:h-11 [&>button:first-child]:w-11 [&>button:first-child]:items-center [&>button:first-child]:justify-center [&>button:first-child]:rounded-lg bp-md:[&>button:first-child]:h-9 bp-md:[&>button:first-child]:w-9">
        <DialogHeader className="pr-12">
          <DialogTitle>후기 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>평점</Label>

            <div
              role="radiogroup"
              aria-label="평점 선택"
              className="flex flex-wrap items-center gap-1"
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
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseEnter={() => onChangeHoverRating(i)}
                    onMouseLeave={() => onChangeHoverRating(null)}
                    onClick={() => onChangeForm((s) => ({ ...s, rating: i }))}
                  >
                    <Star
                      className={`h-6 w-6 ${filled ? "text-warning fill-current stroke-current" : "fill-transparent text-muted-foreground stroke-current"}`}
                      aria-hidden="true"
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
            <Label htmlFor="product-review-edit-content">내용</Label>
            <Textarea
              id="product-review-edit-content"
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
                mobileControls
                responsiveColumns
                onRemove={(url) => {
                  if (!uploadSessionId) return;
                  void onRemove(url, uploadSessionId);
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 sm:flex-col-reverse bp-md:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 w-full bp-md:h-10 bp-md:min-h-10 bp-md:w-auto"
            onClick={onClose}
            disabled={busy || uploadingPhotos}
            aria-disabled={busy || uploadingPhotos}
          >
            취소
          </Button>
          <Button
            type="button"
            className="h-11 min-h-11 w-full bp-md:h-10 bp-md:min-h-10 bp-md:w-auto"
            onClick={onSubmit}
            disabled={busy || uploadingPhotos || !isValid}
            aria-disabled={busy || uploadingPhotos || !isValid}
          >
            {busy ? "저장 중…" : uploadingPhotos ? "사진 업로드 중…" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
