'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, ImagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Photo = string; // http URL

const BUCKET = 'tennis-images'; // 상품과 동일 버킷 사용
const FOLDER = 'reviews'; // 리뷰 전용 하위 폴더

export default function PhotosUploader({ value, onChange, max = 5 }: { value: Photo[]; onChange: (next: Photo[]) => void; max?: number }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = () => inputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remain = Math.max(0, max - (value?.length ?? 0));
    const list = Array.from(files).slice(0, remain);

    const results: string[] = [];

    for (const f of list) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 10 * 1024 * 1024) continue; // 10MB 제한

      const ext = f.name.split('.').pop() || 'jpg';
      const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
        cacheControl: '3600',
        upsert: false,
        contentType: f.type,
      });
      if (upErr) {
        // 필요시 토스트 바인딩
        console.error('upload failed:', upErr.message);
        continue;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) results.push(data.publicUrl);
    }

    if (results.length) onChange([...(value || []), ...results]);
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
              <Image src={src} alt={`photo-${i}`} width={160} height={160} className="object-cover w-full h-24" loading="lazy" />
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
