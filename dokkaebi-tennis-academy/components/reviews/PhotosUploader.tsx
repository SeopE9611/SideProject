'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, ImagePlus, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showErrorToast } from '@/lib/toast';

type Photo = string;

const BUCKET = 'tennis-images'; // 상품과 동일 버킷 사용
const FOLDER = 'reviews'; // 리뷰 전용 하위 폴더

type QueueItem = { id: string; url: string };

type Props = {
  value: Photo[];
  onChange: (next: Photo[]) => void;
  max?: number;
  onUploadingChange?: (uploading: boolean) => void;
};

export default function PhotosUploader({ value, onChange, max = 5, onUploadingChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queueIdPrefix = useId();
  const queueIdRef = useRef(0);

  const totalCount = (value?.length ?? 0) + queue.length;
  const hasRoom = totalCount < max;

  const onPick = () => inputRef.current?.click();

  //timeout 가드 (resolve/reject 안 되어도 ms 지나면 null로 돌아오게)
  const withTimeout = async <T,>(p: Promise<T>, ms = 45000): Promise<T | null> => {
    let done = false;
    return await Promise.race([
      p
        .then((v) => {
          done = true;
          return v;
        })
        .catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => !done && resolve(null), ms)),
    ]);
  };

  const uploadOne = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${FOLDER}/${Date.now()}-${queueIdPrefix}-${queueIdRef.current++}.${ext}`;

    const res = await withTimeout(
      supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      }),
      45000 // 45초
    );

    if (!res || (res as any).error) {
      showErrorToast('이미지 업로드가 지연되거나 실패했어요. 다시 시도해 주세요.');
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!navigator.onLine) {
      showErrorToast('오프라인 상태예요. 네트워크 연결 후 다시 시도해 주세요.');
      return;
    }

    const remain = Math.max(0, max - totalCount);
    const list = Array.from(files).slice(0, remain);
    if (list.length === 0) return;

    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      for (const f of list) {
        if (!f.type.startsWith('image/')) continue;
        if (f.size > 10 * 1024 * 1024) {
          // 10MB 제한
          showErrorToast('10MB 이하 이미지만 업로드할 수 있어요.');
          continue;
        }

        // 미리보기 큐 추가
        const id = `${queueIdPrefix}-${Date.now()}-${queueIdRef.current++}`;
        const objectUrl = URL.createObjectURL(f);
        setQueue((q) => [...q, { id, url: objectUrl }]);

        // 업로드 (타임아웃 가드)
        const publicUrl = await uploadOne(f);

        // 큐 제거 + objectURL 해제 (성공/실패 상관없이 무조건)
        setQueue((q) => q.filter((it) => it.id !== id));
        URL.revokeObjectURL(objectUrl);

        // 성공 시 부모 상태 반영
        if (publicUrl) onChange([...(value || []), publicUrl]);
      }
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const removeAt = (idx: number) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  // 컴포넌트 unmount 시 남아있을 수 있는 objectURL 정리
  useEffect(() => {
    return () => {
      queue.forEach((q) => URL.revokeObjectURL(q.url));
      setQueue([]);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onPick} disabled={!hasRoom || isUploading}>
          <ImagePlus className="h-4 w-4 mr-2" />
          이미지 추가 ({totalCount}/{max})
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.currentTarget.value = ''; // 같은 파일 재선택 허용
          }}
          disabled={isUploading}
        />
        {isUploading && (
          <span className="inline-flex items-center text-xs text-muted-foreground">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            업로드 중…
          </span>
        )}
      </div>

      {(queue.length > 0 || (Array.isArray(value) && value.length > 0)) && (
        <div className="grid grid-cols-3 gap-2">
          {/* 업로드 중 썸네일 */}
          {queue.map((q) => (
            <div key={`q-${q.id}`} className="relative rounded-md overflow-hidden border bg-background">
              <Image src={q.url} alt="uploading" width={160} height={160} className="object-cover w-full h-24" />
              <div className="absolute inset-0 bg-overlay/35 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-foreground" aria-label="업로드 중" />
              </div>
            </div>
          ))}

          {/* 완료된 썸네일 */}
          {value.map((src, i) => (
            <div key={src + i} className="relative group rounded-md overflow-hidden border">
              <Image src={src} alt={`photo-${i}`} width={160} height={160} className="object-cover w-full h-24" loading="lazy" />
              <button type="button" onClick={() => removeAt(i)} className="absolute top-1 right-1 inline-flex p-1 rounded-full bg-overlay/55 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-label="삭제" title="삭제">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 네트워크 경고(옵션): 오프라인이면 즉시 표시 */}
      {!navigator.onLine && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <AlertCircle className="w-3 h-3" />
          오프라인 상태예요. 연결 후 다시 시도해 주세요.
        </div>
      )}
    </div>
  );
}
