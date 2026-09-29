import {
  hasCompletedStringingApplication,
  normalizeStringingApplicationId,
} from "@/app/order-lookup/_lib/stringing-status";

function toNullableFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildGuestOrderLookupDto(order: any, stringingApplicationId: string | null) {
  const shipping = order?.shippingInfo ?? {};

  return {
    id: String(order?._id),
    createdAt: order?.createdAt ?? null,
    status: order?.status ?? null,
    paymentStatus: order?.paymentStatus ?? null,
    paymentMethod: order?.paymentMethod ?? null,
    paymentInfo: {
      status: order?.paymentInfo?.status ?? null,
      method: order?.paymentInfo?.method ?? null,
      provider: order?.paymentInfo?.provider ?? null,
    },
    totalPrice: toNullableFiniteNumber(order?.totalPrice),
    shippingInfo: {
      name: String(shipping.name ?? ""),
      phone: String(shipping.phone ?? ""),
      deliveryMethod: shipping.deliveryMethod ?? null,
      shippingMethod: shipping.shippingMethod ?? null,
      withStringService: Boolean(shipping.withStringService),
    },
    isStringServiceApplied: hasCompletedStringingApplication({
      isStringServiceApplied: stringingApplicationId ? true : order?.isStringServiceApplied,
      stringingApplicationId,
    }),
    stringingApplicationId,
  };
}

export function latestApplicationIds(apps: any[]) {
  const map = new Map<string, string>();

  for (const app of apps) {
    const orderId = String(app?.orderId ?? "");
    const appId = String(app?._id ?? "").trim();
    if (orderId && appId && !map.has(orderId)) map.set(orderId, appId);
  }

  return map;
}

function lines(details: any): any[] {
  return Array.isArray(details?.lines)
    ? details.lines
    : Array.isArray(details?.racketLines)
      ? details.racketLines
      : [];
}

function reception(method?: string | null) {
  return method === "visit"
    ? "방문 접수"
    : method === "courier_pickup"
      ? "자가 발송(택배)"
      : "발송 접수";
}

function tension(orderLines: any[]) {
  const values = Array.from(
    new Set(
      orderLines
        .map((line) => {
          const main = String(line?.tensionMain ?? "").trim();
          const cross = String(line?.tensionCross ?? "").trim();
          return cross && cross !== main ? `${main}/${cross}` : main || cross;
        })
        .filter(Boolean),
    ),
  );

  return values.length ? values.join(", ") : null;
}

export function buildGuestOrderDetailDto(order: any, apps: any[]) {
  const summaries = apps.map((app) => {
    const orderLines = lines(app?.stringDetails);
    const date = String(app?.stringDetails?.preferredDate ?? "").trim();
    const time = String(app?.stringDetails?.preferredTime ?? "").trim();

    return {
      id: String(app._id),
      status: app.status ?? "draft",
      createdAt: app.createdAt ?? null,
      racketCount: orderLines.length,
      receptionLabel: reception(app?.collectionMethod),
      tensionSummary: tension(orderLines),
      stringNames: Array.from(
        new Set(orderLines.map((line) => String(line?.stringName ?? "").trim()).filter(Boolean)),
      ),
      reservationLabel: date && time ? `${date} ${time}` : null,
    };
  });
  const latest = [...summaries].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  )[0];
  const stringingApplicationId =
    latest?.id ?? normalizeStringingApplicationId(order?.stringingApplicationId);
  const shipping = order?.shippingInfo ?? {};
  const payment = order?.paymentInfo ?? {};

  return {
    _id: String(order._id),
    createdAt: order.createdAt ?? null,
    status: String(order.status ?? ""),
    paymentStatus: order.paymentStatus ?? null,
    paymentMethod: order.paymentMethod ?? null,
    totalPrice: toNullableFiniteNumber(order.totalPrice),
    shippingFee: Number(order.shippingFee ?? 0),
    trackingNumber: order.trackingNumber ?? shipping?.invoice?.trackingNumber ?? null,
    shippingInfo: {
      name: String(shipping.name ?? ""),
      phone: String(shipping.phone ?? ""),
      address: String(shipping.address ?? ""),
      deliveryMethod: shipping.deliveryMethod ?? null,
      shippingMethod: shipping.shippingMethod ?? null,
      withStringService: Boolean(shipping.withStringService),
      invoice: shipping.invoice
        ? {
            courier: shipping.invoice.courier ?? null,
            trackingNumber: shipping.invoice.trackingNumber ?? null,
          }
        : null,
    },
    paymentInfo: {
      status: payment.status ?? null,
      method: payment.method ?? null,
      provider: payment.provider ?? null,
      easyPayProvider: payment.easyPayProvider ?? payment.rawSummary?.easyPay?.provider ?? null,
      cardDisplayName: payment.cardDisplayName ?? payment.niceCard?.displayName ?? null,
      cardCompany: payment.cardCompany ?? payment.niceCard?.issuerName ?? null,
      cardLabel: payment.cardLabel ?? payment.niceCard?.cardName ?? null,
      bank: payment.bank ?? null,
      depositor: payment.depositor ?? shipping.depositor ?? null,
    },
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          id: item?._id ? String(item._id) : item?.productId ? String(item.productId) : null,
          name: String(item?.name ?? item?.productName ?? ""),
          option: item?.option ?? item?.selectedOption ?? null,
          price: Number(item?.price ?? item?.unitPrice ?? 0),
          quantity: Number(item?.quantity ?? 0),
          image: item?.image ?? item?.imageUrl ?? null,
        }))
      : [],
    isStringServiceApplied: hasCompletedStringingApplication({
      isStringServiceApplied: stringingApplicationId ? true : order?.isStringServiceApplied,
      stringingApplicationId,
    }),
    stringingApplicationId,
    stringingApplications: summaries,
  };
}
