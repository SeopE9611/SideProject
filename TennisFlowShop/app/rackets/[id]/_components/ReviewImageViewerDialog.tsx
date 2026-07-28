"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-0 sm:max-w-[calc(100%-2rem)] bp-md:max-w-4xl [&>button:first-child]:inline-flex [&>button:first-child]:h-11 [&>button:first-child]:w-11 [&>button:first-child]:items-center [&>button:first-child]:justify-center [&>button:first-child]:rounded-lg [&>button:first-child]:bg-card/90 [&>button:first-child]:hover:bg-muted bp-md:[&>button:first-child]:h-9 bp-md:[&>button:first-child]:w-9">
        <DialogHeader className="border-b border-border/60 p-4 pr-16 text-left bp-sm:p-5 bp-sm:pr-16">
          <DialogTitle>후기 사진 확대 보기</DialogTitle>
        </DialogHeader>

        {images.length > 0 ? (
          <div>
            <div className="relative aspect-[4/3] w-full bg-muted/20 bp-md:aspect-video">
              <Image
                src={images[index]}
                alt={`후기 사진 확대 ${index + 1}`}
                fill
                className="object-contain"
                sizes="(min-width: 768px) 896px, calc(100vw - 2rem)"
              />
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

            <div className="p-4 text-center text-ui-body-sm text-muted-foreground" aria-live="polite">
              {index + 1} / {images.length}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
