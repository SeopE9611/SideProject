'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Box, Wrench, Star } from 'lucide-react';

export function UserActivityTabsSection({ orders, apps, reviews, MiniList, Row }: { orders: any[]; apps: any[]; reviews: any[]; MiniList: any; Row: any }) {
  return (
    <Tabs defaultValue="orders">
      <TabsList className="mb-3">
        <TabsTrigger value="orders" className="gap-1"><Box className="h-3.5 w-3.5" />주문</TabsTrigger>
        <TabsTrigger value="apps" className="gap-1"><Wrench className="h-3.5 w-3.5" />신청</TabsTrigger>
        <TabsTrigger value="reviews" className="gap-1"><Star className="h-3.5 w-3.5" />리뷰</TabsTrigger>
      </TabsList>

      <TabsContent value="orders">
        <MiniList
          empty="최근 주문이 없습니다."
          items={orders}
          render={(o: any) => (
            <Row
              title={o?.title || o?.number || `주문 #${o?._id || o?.id || '-'}`}
              subtitle={o?.status || o?.computedStatus || '—'}
              right={o?.totalPrice ? `${o.totalPrice.toLocaleString()}원` : ''}
              href={o?._id || o?.id ? `/admin/orders/${o._id || o.id}` : undefined}
            />
          )}
        />
      </TabsContent>

      <TabsContent value="apps">
        <MiniList
          empty="최근 신청이 없습니다."
          items={apps}
          render={(a: any) => (
            <Row
              title={a?.racketType || a?.stringTypes?.join(', ') || `신청 #${a?._id || a?.id || '-'}`}
              subtitle={a?.status || a?.applicationStatus || '—'}
              right={a?.price ? `${a.price.toLocaleString()}원` : ''}
              href={a?._id || a?.id ? `/admin/applications/stringing/${a._id || a.id}` : undefined}
            />
          )}
        />
      </TabsContent>

      <TabsContent value="reviews">
        <MiniList
          empty="최근 리뷰가 없습니다."
          items={reviews}
          render={(r: any) => (
            <Row
              title={r?.title || `리뷰 #${r?._id || r?.id || '-'}`}
              subtitle={(r?.rating ? `★ ${r.rating}` : '') + (r?.isPublic === false ? ' · 비공개' : '')}
              right={r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
              href={r?._id || r?.id ? `/admin/reviews/${r._id || r.id}` : undefined}
            />
          )}
        />
      </TabsContent>
    </Tabs>
  );
}
