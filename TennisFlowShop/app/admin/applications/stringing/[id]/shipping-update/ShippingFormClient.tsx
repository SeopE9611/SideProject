"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AsyncState from "@/components/system/AsyncState";
import { Loader2, Store, Truck } from "lucide-react";
import ShippingForm from "@/app/admin/applications/stringing/[id]/shipping-update/shipping-form";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { isVisitPickupOrder } from "@/lib/order-shipping";

type Application = {
  _id: string;
  collectionMethod?: string;
  linkedOrderPickupMethod?: string | null;
  shippingInfo?: {
    shippingMethod?: string;
    deliveryMethod?: string;
    collectionMethod?: string;
    estimatedDate?: string;
    invoice?: {
      courier?: string;
      trackingNumber?: string;
    };
  };
};

export interface Props {
  applicationId: string;
  onSuccess?: () => void;
}

const isVisitContext = (app?: Application): boolean => {
  const collection = String(
    app?.collectionMethod ?? app?.shippingInfo?.collectionMethod ?? "",
  )
    .trim()
    .toLowerCase();
  if (collection === "visit") return true;

  const linkedPickup = String(app?.linkedOrderPickupMethod ?? "")
    .trim()
    .toLowerCase();
  if (linkedPickup === "visit") return true;

  const shippingMethod =
    app?.shippingInfo?.shippingMethod ?? app?.shippingInfo?.deliveryMethod;
  return isVisitPickupOrder({ shippingMethod });
};

export default function ShippingFormClient({
  applicationId,
  onSuccess,
}: Props) {
  const { data, error, isLoading, mutate } = useSWR<Application>(
    `/api/admin/applications/stringing/${applicationId}`,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const shippingInfo = data?.shippingInfo ?? {};
  const invoice = shippingInfo.invoice ?? {};

  // 기존 배송정보가 하나라도 있으면 "수정", 아무것도 없으면 "등록"
  const rawMethod =
    shippingInfo.shippingMethod ?? shippingInfo.deliveryMethod ?? "";
  const method = String(rawMethod).trim();
  const date = String(shippingInfo.estimatedDate ?? "").trim();
  const courier = String(invoice.courier ?? "").trim();
  const tracking = String(invoice.trackingNumber ?? "").trim();
  const isRegistered = Boolean(method || date || courier || tracking);

  // stringing 배송 정보 화면도 주문과 동일한 공용 유틸로 방문 수령 여부를 판별한다.
  const isVisitPickup = isVisitContext(data);
  const pageTitle = data
    ? isVisitPickup
      ? isRegistered
        ? "방문 수령 정보 수정"
        : "방문 수령 정보 등록"
      : isRegistered
        ? "배송 정보 수정"
        : "배송 정보 등록"
    : "배송 정보 관리";
  const pageDesc = data
    ? isVisitPickup
      ? isRegistered
        ? "방문 수령 준비를 위한 예상 수령일 정보를 수정할 수 있습니다."
        : "방문 수령 준비를 위한 예상 수령일 정보를 등록할 수 있습니다."
      : isRegistered
        ? "배송 방법과 예상 수령일을 수정할 수 있습니다."
        : "배송 방법과 예상 수령일을 등록할 수 있습니다."
    : "신청 정보를 확인하고 배송 정보를 관리할 수 있습니다.";

  let content = null;
  if (isLoading) {
    content = (
      <Card className="border-border/60">
        <CardContent className="space-y-5 p-6">
          <Skeleton className="h-5 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  } else if (error || !data) {
    content = (
      <AsyncState
        kind="error"
        tone="admin"
        variant="card"
        resourceName="신청 정보"
        onAction={() => {
          void mutate();
        }}
      />
    );
  } else {
    content = (
      <ShippingForm
        applicationId={applicationId}
        initialShippingMethod={rawMethod}
        initialEstimatedDelivery={shippingInfo.estimatedDate || ""}
        initialCourier={invoice.courier || ""}
        initialTrackingNumber={invoice.trackingNumber || ""}
        onSuccess={onSuccess}
        isVisitPickup={isVisitPickup}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <div className="bg-card rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
            {isVisitPickup ? (
              <Store className="h-8 w-8 text-primary mx-auto" />
            ) : (
              <Truck className="h-8 w-8 text-primary mx-auto" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground">{pageDesc}</p>
        </div>
        {content}
      </div>
    </div>
  );
}
