'use client';

import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const getKey = (index: number, prev: any) => {
  if (prev && prev.items && prev.items.length === 0) return null;
  const page = index + 1;
  return `/api/me/rentals?page=${page}&pageSize=20`;
};

export default function RentalsList() {
  const { data, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher);
  const flat = (data ?? []).flatMap((d: any) => d.items ?? []);

  return (
    <div className="space-y-3">
      {flat.length === 0 && <p className="text-sm text-muted-foreground">대여 내역이 없습니다.</p>}

      {flat.map((r: any) => (
        <Card key={r.id} className="overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">
                {r.brand} {r.model}
              </div>
              <div className="text-xs text-muted-foreground">
                기간: {r.days}일 · 상태: {r.status} · 수수료 {r.amount?.fee?.toLocaleString()}원 · 보증금 {r.amount?.deposit?.toLocaleString()}원
              </div>
            </div>
            <Link className="text-sm underline" href={`/mypage?tab=rentals&id=${r.id}`}>
              상세
            </Link>
          </CardContent>
        </Card>
      ))}

      {data && data[data.length - 1]?.items?.length === 20 && (
        <div className="pt-2">
          <Button size="sm" variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}
