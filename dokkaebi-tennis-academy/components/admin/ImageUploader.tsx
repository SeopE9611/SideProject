'use client';

import Image from 'next/image';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { showErrorToast } from '@/lib/toast';

type Variant = 'review' | 'string' | 'racket';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  variant?: Variant; // 기본 경로 프리셋
  folder?: string; // 직접 경로 지정 시 variant 무시
  enablePrimary?: boolean; // 대표 지정 허용(=순서 변경 허용)
  onUploadingChange?: (v: boolean) => void;
};

const BUCKET = 'tennis-images';
const DEFAULT_FOLDER: Record<Variant, string> = {
  review: 'reviews',
  string: 'products/strings',
  racket: 'products/rackets',
};

export default function ImageUploader({ value, onChange, max = 10, variant = 'review', folder, enablePrimary = true, onUploadingChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const targetFolder = folder ?? DEFAULT_FOLDER[variant];

  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;

      setUploading(true);
      onUploadingChange?.(true);
      try {
        const next = [...value];
        for (const f of files.slice(0, Math.max(0, max - next.length))) {
          if (!f.type.startsWith('image/')) continue;
          if (f.size > 10 * 1024 * 1024) {
            showErrorToast('10MB 이하 이미지만 업로드할 수 있어요.');
            continue;
          }

          const ext = f.name.split('.').pop() || 'jpg';
          const key = `${targetFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

          const { error } = await supabase.storage.from(BUCKET).upload(key, f);

          if (error) {
            // 디버깅용: 배포 환경에서 실제 에러 메시지 확인
            console.error('[ImageUploader] Supabase upload error', {
              message: error.message,
              name: error.name,
              status: (error as any)?.status,
              bucket: BUCKET,
              key,
            });

            showErrorToast('이미지 업로드 중 오류가 발생했습니다.');
            continue;
          }
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
          const url = data?.publicUrl;
          if (url) next.push(url);
        }
        onChange(next);
      } finally {
        setUploading(false);
        onUploadingChange?.(false);
      }
    };
    input.click();
  };

  const removeAt = (i: number) => {
    const n = [...value];
    n.splice(i, 1);
    onChange(n);
  };
  const makePrimary = (i: number) => {
    if (!enablePrimary || i === 0) return;
    const n = [...value];
    const [x] = n.splice(i, 1);
    n.unshift(x);
    onChange(n);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {value.map((src, i) => (
          <div key={src + i} className="relative group rounded-md overflow-hidden border">
            <Image src={src} alt="" width={160} height={160} className="object-cover w-40 h-40" />
            {enablePrimary && i === 0 && <span className="absolute left-1 top-1 text-[11px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">대표</span>}
            {enablePrimary && i > 0 && (
              <button type="button" onClick={() => makePrimary(i)} className="absolute left-1 top-1 text-[11px] bg-white/90 border px-1.5 py-0.5 rounded shadow">
                대표로
              </button>
            )}
            <button type="button" onClick={() => removeAt(i)} className="absolute right-1 top-1 bg-white/90 border rounded p-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={pick} className="w-40 h-40 border border-dashed rounded grid place-items-center text-sm">
            이미지 추가
          </button>
        )}
      </div>

      {uploading && <p className="text-xs text-muted-foreground">업로드 중…</p>}
      <div className="text-xs text-muted-foreground">첫 번째 이미지가 대표로 사용됩니다.</div>
      <Button type="button" variant="outline" onClick={pick}>
        이미지 추가
      </Button>
    </div>
  );
}
