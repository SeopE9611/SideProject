"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-0 sm:max-w-[calc(100%-2rem)] bp-md:max-w-4xl [&>button:first-child]:inline-flex [&>button:first-child]:h-11 [&>button:first-child]:w-11 [&>button:first-child]:items-center [&>button:first-child]:justify-center [&>button:first-child]:rounded-lg [&>button:first-child]:bg-card/90 [&>button:first-child]:hover:bg-muted bp-md:[&>button:first-child]:h-9 bp-md:[&>button:first-child]:w-9">
        <DialogHeader className="border-b border-border/60 p-4 pr-16 text-left bp-sm:p-5 bp-sm:pr-16">
          <DialogTitle>후기 사진 확대 보기</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[4/3] w-full bg-muted/20 bp-md:aspect-video">
          {images[index] && (
            <Image
              src={images[index] || "/placeholder.svg"}
              alt={`후기 사진 확대 ${index + 1}`}
              fill
              className="object-contain"
              priority
              sizes="(min-width: 768px) 896px, calc(100vw - 2rem)"
            />
          )}

          {images.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onPrev}
                className="absolute left-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-card/90 shadow-md hover:bg-card bp-md:h-10 bp-md:w-10"
                aria-label="이전 사진"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="absolute right-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-card/90 shadow-md hover:bg-card bp-md:h-10 bp-md:w-10"
                aria-label="다음 사진"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>

        <div className="text-center text-ui-body-sm text-muted-foreground" aria-live="polite">
          {index + 1} / {images.length}
        </div>

        {images.length > 1 && (
          <div className="flex overflow-x-auto border-t border-border/60 bg-card p-3">
            <div className="mx-auto flex min-w-max gap-2">
              {images.map((thumb, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChangeIndex(i)}
                  className={`relative h-16 w-16 overflow-hidden rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === index ? "border-primary ring-2 ring-ring" : "border-border"}`}
                  aria-pressed={i === index}
                  aria-label={`후기 사진 ${i + 1} 보기`}
                >
                  <Image
                    src={thumb || "/placeholder.svg"}
                    alt={`썸네일 ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
