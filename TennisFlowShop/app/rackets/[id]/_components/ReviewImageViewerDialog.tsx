"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function ReviewImageViewerDialog({
  open,
  onOpenChange,
  images,
  index,
  onPrev,
  onNext,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>리뷰 이미지</DialogTitle>
        </DialogHeader>

        {images.length > 0 ? (
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={images[index]}
                alt={`리뷰 이미지 ${index + 1}`}
                fill
                className="object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={onPrev} disabled={images.length <= 1}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                이전
              </Button>

              <div className="text-sm text-muted-foreground">
                {index + 1} / {images.length}
              </div>

              <Button variant="outline" onClick={onNext} disabled={images.length <= 1}>
                다음
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
