'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photos: string[];
  initialIndex?: number;
};

export default function ReviewPhotoDialog({ open, onOpenChange, photos, initialIndex = 0 }: Props) {
  const [idx, setIdx] = useState(initialIndex);

  // 다이얼로그 열릴 때마다 시작 인덱스 맞춰줌
  useEffect(() => {
    if (!open) return;
    const safe = Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0));
    setIdx(safe);
  }, [open, initialIndex, photos.length]);

  const next = () => setIdx((i) => (i + 1) % photos.length);
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 bg-black/90 text-white border-0">
        <DialogHeader>
          <DialogTitle className="sr-only">리뷰 사진 보기</DialogTitle>
        </DialogHeader>

        <div className="relative w-full aspect-video">
          {photos[idx] && <Image src={photos[idx] || '/placeholder.svg'} alt={`리뷰 사진 ${idx + 1}`} fill className="object-contain" priority />}

          {photos.length > 1 && (
            <>
              <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card/20 hover:bg-card/30" aria-label="이전 사진">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card/20 hover:bg-card/30" aria-label="다음 사진">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="p-3 flex flex-wrap gap-2 justify-center bg-black/70">
            {photos.map((src, i) => (
              <button key={i} type="button" onClick={() => setIdx(i)} className={`relative w-16 h-16 rounded-md overflow-hidden border ${i === idx ? 'ring-2 ring-emerald-400' : ''}`} aria-label={`썸네일 ${i + 1}`}>
                <Image src={src || '/placeholder.svg'} alt={`썸네일 ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
