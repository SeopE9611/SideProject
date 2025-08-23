'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, ImagePlus } from 'lucide-react';

type Photo = string; // data: URL 또는 http URL

export default function PhotosUploader({ value, onChange, max = 5 }: { value: Photo[]; onChange: (next: Photo[]) => void; max?: number }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = () => inputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remain = Math.max(0, max - (value?.length ?? 0));
    const list = Array.from(files).slice(0, remain);

    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = reject;
        fr.readAsDataURL(f);
      });

    const results: string[] = [];
    for (const f of list) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 10 * 1024 * 1024) continue; // 10MB
      try {
        results.push(await toDataUrl(f));
      } catch {}
    }
    onChange([...(value || []), ...results]);
  };

  const removeAt = (idx: number) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  const hasRoom = (value?.length ?? 0) < max;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onPick} disabled={!hasRoom}>
          <ImagePlus className="h-4 w-4 mr-2" />
          이미지 추가 {hasRoom ? `(${value?.length ?? 0}/${max})` : '(최대)'}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {Array.isArray(value) && value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((src, i) => (
            <div key={i} className="relative group rounded-md overflow-hidden border">
              <Image src={src} alt={`photo-${i}`} width={160} height={160} className="object-cover w-full h-24" />
              <button type="button" onClick={() => removeAt(i)} className="absolute top-1 right-1 inline-flex p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="삭제">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
