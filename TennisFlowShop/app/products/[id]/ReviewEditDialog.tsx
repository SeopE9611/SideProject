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
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>리뷰 수정</DialogTitle>
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
                      className={`h-6 w-6 ${filled ? "text-warning fill-current stroke-current" : "stroke-muted-foreground"}`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-sm text-muted-foreground">
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
              placeholder="리뷰 내용을 입력하세요."
            />
            <div className="mt-3">
              <Label>사진 (선택, 최대 5장)</Label>
              <PhotosUploader
                value={editForm.photos}
                onChange={(arr) => onChangeForm((s) => ({ ...s, photos: arr }))}
                max={5}
                previewMode="queue"
              />
              <PhotosReorderGrid
                value={editForm.photos}
                onChange={(arr) => onChangeForm((s) => ({ ...s, photos: arr }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md border text-sm"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
            onClick={onSubmit}
          >
            저장
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
