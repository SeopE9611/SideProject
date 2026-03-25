"use client";

import PhotosReorderGrid from "@/components/reviews/PhotosReorderGrid";
import PhotosUploader from "@/components/reviews/PhotosUploader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";

type EditForm = {
  rating: number | "";
  content: string;
  photos: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  hoverRating: number | null;
  setHoverRating: React.Dispatch<React.SetStateAction<number | null>>;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function ReviewEditDialog({
  open,
  onOpenChange,
  editForm,
  setEditForm,
  hoverRating,
  setHoverRating,
  busy,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>리뷰 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>별점</Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const score = i + 1;
                const active =
                  (hoverRating ??
                    (editForm.rating === "" ? 0 : Number(editForm.rating))) >=
                  score;
                return (
                  <button
                    key={i}
                    type="button"
                    className="p-1"
                    onMouseEnter={() => setHoverRating(score)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setEditForm((p) => ({ ...p, rating: score }))}
                    aria-label={`별점 ${score}점`}
                  >
                    <Star
                      className={`h-5 w-5 ${active ? "text-primary fill-primary" : "text-muted-foreground/40"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>내용</Label>
            <Textarea
              value={editForm.content}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, content: e.target.value }))
              }
              rows={6}
              placeholder="리뷰 내용을 입력하세요."
            />
          </div>

          <div className="space-y-2">
            <Label>사진</Label>
            <PhotosUploader
              value={editForm.photos}
              onChange={(photos) => setEditForm((p) => ({ ...p, photos }))}
            />
            <PhotosReorderGrid
              value={editForm.photos}
              onChange={(photos) => setEditForm((p) => ({ ...p, photos }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              취소
            </Button>
            <Button onClick={onSubmit} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
