import RacketDetailClient from '@/app/rackets/[id]/_components/RacketDetailClient';
import SiteContainer from '@/components/layout/SiteContainer';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

async function absoluteUrl(path: string) {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}${path}` : path; // 드문 케이스 폴백
}

async function getData(id: string) {
  const url = await absoluteUrl(`/api/rackets/${id}`);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function getStock(id: string) {
  const url = await absoluteUrl(`/api/rentals/active-count/${id}`);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { ok: false, quantity: 1, available: 0 };
  return res.json();
}

export default async function RacketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getData(id);
  if (!doc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-muted">
        <SiteContainer variant="wide" className="py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">존재하지 않는 라켓입니다.</h1>
          </div>
        </SiteContainer>
      </div>
    );
  }

  const stock = await getStock(id);
  const qty = Number(stock?.quantity ?? 1);
  const avail = Number.isFinite(stock?.available) ? Math.max(0, Number(stock?.available)) : 0;

  return <RacketDetailClient racket={doc} stock={{ quantity: qty, available: avail }} />;
}
