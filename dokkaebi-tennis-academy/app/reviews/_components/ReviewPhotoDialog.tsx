'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ReviewPhotoDialog({ open, onOpenChange, photos }: { open: boolean; onOpenChange: (v: boolean) => void; photos: string[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>리뷰 사진</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((src, i) => (
            <div key={i} className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-100">
              <Image src={src} alt={`review-photo-${i}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
