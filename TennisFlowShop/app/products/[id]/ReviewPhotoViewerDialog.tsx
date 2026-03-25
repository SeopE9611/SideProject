"use client";

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
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onChangeIndex: (idx: number) => void;
};

export default function ReviewPhotoViewerDialog({
  open,
  images,
  index,
  onClose,
  onPrev,
  onNext,
  onChangeIndex,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
      <DialogContent className="sm:max-w-4xl p-0 bg-background/90 text-foreground border border-border">
        {/* 접근성용 제목(시각적으로 숨김) */}
        <DialogHeader className="sr-only">
          <DialogTitle>리뷰 사진 확대 보기</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-video">
          {images[index] && (
            <Image
              src={images[index] || "/placeholder.svg"}
              alt={`리뷰 사진 확대 ${index + 1}`}
              fill
              className="object-contain"
              priority
            />
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-10 w-10 rounded-full bg-card/20 hover:bg-card/30"
                aria-label="이전 사진"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-10 w-10 rounded-full bg-card/20 hover:bg-card/30"
                aria-label="다음 사진"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="p-3 flex flex-wrap gap-2 justify-center bg-background/80 backdrop-blur border border-border">
            {images.map((thumb, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChangeIndex(i)}
                className={`relative w-16 h-16 rounded-md overflow-hidden border ${i === index ? "ring-2 ring-ring" : ""}`}
                aria-label={`썸네일 ${i + 1}`}
              >
                <Image
                  src={thumb || "/placeholder.svg"}
                  alt={`썸네일 ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
