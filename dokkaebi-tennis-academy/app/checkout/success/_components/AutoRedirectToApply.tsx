'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AutoRedirectToApply({ enabled, href, seconds = 5 }: { enabled: boolean; href: string; seconds?: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (paused) return;

    if (left <= 0) {
      router.push(href);
      return;
    }

    const id = window.setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [enabled, paused, left, href, router]);

  if (!enabled) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-yellow-100">
      <span>잠시 후 신청서로 이동합니다 ({left}초)</span>
      <Button type="button" variant="secondary" size="sm" onClick={() => setPaused(true)}>
        멈춤
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => router.push(href)}>
        지금 이동
      </Button>
    </div>
  );
}
