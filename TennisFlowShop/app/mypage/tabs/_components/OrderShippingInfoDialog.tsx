 'use client';

 import { useMemo, useState } from 'react';
 import useSWR from 'swr';
 import { Copy, Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { authenticatedSWRFetcher } from '@/lib/fetchers/authenticatedSWRFetcher';
import { getOrderDeliveryInfoTitle, isVisitPickupOrder } from '@/lib/order-shipping';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
 type CourierCode =
   | 'cj'
   | 'hanjin'
   | 'logen'
   | 'lotte'
   | 'post'
   | 'daesin'
   | 'ilogen'
   | 'kr'
   | 'etc'
   | string;

 type OrderDetail = {
   shippingInfo?: {
     shippingMethod?: string;
     deliveryMethod?: string;
     name?: string;
     phone?: string;
     address?: string;
     addressDetail?: string;
     postalCode?: string;
     deliveryRequest?: string;
     invoice?: {
       courier?: CourierCode;
       trackingNumber?: string;
       updatedAt?: string;
     };
   };
 };

function courierLabel(code?: CourierCode) {
   switch (code) {
     case 'cj':
       return 'CJ대한통운';
     case 'hanjin':
       return '한진택배';
     case 'logen':
       return '로젠택배';
     case 'lotte':
       return '롯데택배';
     case 'post':
       return '우체국택배';
     case 'daesin':
       return '대신택배';
     case 'ilogen':
       return '일로젠';
     case 'kr':
       return '대한통운(구)';
     case 'etc':
       return '기타';
     default:
       return code || '-';
   }
 }

 async function copyToClipboard(text: string) {
   try {
     await navigator.clipboard.writeText(text);
     showSuccessToast('복사했습니다.');
   } catch {
     showErrorToast('복사에 실패했습니다.');
   }
 }

 /**
  * 전체내역(Activity) 카드에서 운송장/배송 정보를 빠르게 확인하기 위한 모달
  * - Activity API에는 invoice가 없으므로, 모달이 열릴 때만 주문 상세 API를 호출합니다.
  */
export default function OrderShippingInfoDialog({
  orderId,
  className,
  triggerLabel = '배송/수령 정보',
}: {
  orderId: string;
  className?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR<OrderDetail>(open ? `/api/orders/${orderId}` : null, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const invoice = data?.shippingInfo?.invoice;
  const isVisitPickup = isVisitPickupOrder(data?.shippingInfo);
  const infoTitle = getOrderDeliveryInfoTitle(data?.shippingInfo);
  const courier = invoice?.courier;
  const trackingNumber = invoice?.trackingNumber;
   const hasInvoice = Boolean(courier || trackingNumber);

   const addressText = useMemo(() => {
     const s = data?.shippingInfo;
     const line1 = [s?.address, s?.addressDetail].filter(Boolean).join(' ');
     const line2 = s?.postalCode ? `(${s.postalCode})` : '';
     return [line1, line2].filter(Boolean).join(' ');
   }, [data]);

   return (
     <Dialog open={open} onOpenChange={setOpen}>
       <DialogTrigger asChild>
         <Button type="button" size="sm" variant="outline" className={className}>
           <Truck className="mr-2 h-4 w-4" />
           {triggerLabel}
         </Button>
       </DialogTrigger>

       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle>{infoTitle}</DialogTitle>
         </DialogHeader>

         {isLoading ? (
           <div className="space-y-4">
             <div className="flex items-center gap-2">
               <Skeleton className="h-6 w-24 rounded-full" />
               <Skeleton className="h-6 w-36 rounded-full" />
             </div>

             <Separator />

             <div className="space-y-2">
               <Skeleton className="h-4 w-14" />
               <Skeleton className="h-4 w-3/4" />
             </div>

             <div className="space-y-2">
               <Skeleton className="h-4 w-10" />
               <Skeleton className="h-4 w-full" />
             </div>

             <div className="space-y-2">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-4 w-2/3" />
             </div>
           </div>
         ) : !hasInvoice ? (
           <div className="space-y-2 text-sm">
             {isVisitPickup ? (
               <>
                 <p className="text-muted-foreground">방문 수령 주문입니다. 방문 일정/상태는 주문 상세에서 확인해주세요.</p>
                 <p className="text-muted-foreground">운송장 정보가 없는 것이 정상일 수 있습니다.</p>
               </>
             ) : (
               <>
                 <p className="text-muted-foreground">아직 운송장(택배사/운송장번호) 정보가 등록되지 않았습니다.</p>
                 <p className="text-muted-foreground">관리자가 운송장 입력 후 배송 상태를 변경하면 이곳에서 확인할 수 있습니다.</p>
               </>
             )}
           </div>
         ) : (
           <div className="space-y-4">
             <div className="flex flex-wrap items-center gap-2">
               <Badge variant="secondary">{courierLabel(courier)}</Badge>
               {trackingNumber ? <Badge variant="outline">{trackingNumber}</Badge> : null}
               {trackingNumber ? (
                 <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => copyToClipboard(trackingNumber)}>
                   <Copy className="h-4 w-4" />
                   <span className="sr-only">운송장 번호 복사</span>
                 </Button>
               ) : null}
             </div>

             <Separator />

             <div className="space-y-1 text-sm">
               <div className="font-medium">수령인</div>
               <div className="text-muted-foreground">{[data?.shippingInfo?.name, data?.shippingInfo?.phone].filter(Boolean).join(' / ') || '-'}</div>
             </div>

             <div className="space-y-1 text-sm">
               <div className="font-medium">주소</div>
               <div className="text-muted-foreground">{addressText || '-'}</div>
             </div>

             {data?.shippingInfo?.deliveryRequest ? (
               <div className="space-y-1 text-sm">
                 <div className="font-medium">배송 요청사항</div>
                 <div className="text-muted-foreground">{data.shippingInfo.deliveryRequest}</div>
               </div>
             ) : null}

             {invoice?.updatedAt ? (
               <div className="text-xs text-muted-foreground">운송장 업데이트: {new Date(invoice.updatedAt).toLocaleString()}</div>
             ) : null}
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 }
