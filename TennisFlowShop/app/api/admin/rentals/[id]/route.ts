import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { normalizeRentalPaymentMeta } from "@/lib/admin-ops-normalize";

function maskAccount(acct?: string) {
  if (!acct) return "";
  const last4 = String(acct).slice(-4);
  return `••••${last4}`;
}

function getStringNameCandidates(...values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (Array.isArray(value)) return value;
          if (typeof value === "string") return value.split(/[,+/]/);
          return [];
        })
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function getRentalStringNames(doc: any): string[] {
  return getStringNameCandidates(
    doc?.stringing?.stringName,
    doc?.stringing?.stringProductName,
    doc?.stringing?.name,
    doc?.stringName,
    doc?.stringProductName,
    doc?.stringingStringName,
    doc?.selectedStringName,
  );
}

function normalizeShippingSide(side: any) {
  if (!side || typeof side !== "object") return null;
  const trackingNumber = String(
    side.trackingNumber ?? side.trackingNo ?? side.tracking_no ?? "",
  ).trim();
  const courier = String(side.courier ?? side.carrier ?? "").trim();
  const shippedAt = side.shippedAt ?? side.shipped_at ?? null;
  if (!trackingNumber && !courier && !shippedAt && !side.note) return null;
  return {
    courier,
    trackingNumber,
    shippedAt,
    note: side.note ?? null,
  };
}

function getApplicationLines(stringDetails: any): any[] {
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines)) return stringDetails.racketLines;
  return [];
}

function getReceptionLabel(collectionMethod?: string | null): string {
  if (collectionMethod === "visit") return "방문 접수";
  if (collectionMethod === "courier_pickup") return "자가 발송(택배)";
  return "발송 접수";
}

function getTensionSummary(lines: any[]): string | null {
  const set = Array.from(
    new Set(
      lines
        .map((line: any) => {
          const main = String(line?.tensionMain ?? "").trim();
          const cross = String(line?.tensionCross ?? "").trim();
          if (!main && !cross) return "";
          return cross && cross !== main ? `${main}/${cross}` : main || cross;
        })
        .filter(Boolean),
    ),
  );
  return set.length ? set.join(", ") : null;
}

function normalizeServicePickupMethod(v: any): "SELF_SEND" | "COURIER_VISIT" | "SHOP_VISIT" | null {
  const raw = String(v ?? "")
    .trim()
    .toUpperCase();
  if (raw === "SELF_SEND" || raw === "COURIER_VISIT" || raw === "SHOP_VISIT") return raw;
  if (raw === "DELIVERY") return "SELF_SEND";
  if (raw === "PICKUP") return "SHOP_VISIT";
  return null;
}

function getPickupMethodLabel(method: "SELF_SEND" | "COURIER_VISIT" | "SHOP_VISIT" | null): string {
  if (method === "SHOP_VISIT") return "방문 수령";
  if (method === "COURIER_VISIT") return "자가 발송(택배)";
  return "택배 발송";
}

function maskName(name?: string) {
  if (!name) return "";
  // 한 글자 이름: 그대로, 두 글자 이상: 마지막 글자만 노출
  if (name.length <= 1) return name;
  return name.slice(0, -1).replace(/./g, "•") + name.slice(-1);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!("ok" in guard) || !guard.ok) return guard.res;
  const db = guard.db;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "BAD_ID" }, { status: 400 });
  }

  const doc = await db.collection("rental_orders").findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ message: "Not Found" }, { status: 404 });

  const latestHistory = await db
    .collection("rental_history")
    .findOne({ rentalId: doc._id }, { sort: { at: -1 } });

  // 고객 정보 조인
  let user: { name?: string; email?: string; phone?: string } | null = null;
  if (doc.userId) {
    const u = await db.collection("users").findOne({ _id: doc.userId });
    if (u) user = { name: u.name ?? "", email: u.email ?? "", phone: u.phone ?? "" };
  }

  // 환불계좌(관리자 전용, 마스킹)
  const refundAccount = doc.refundAccount
    ? {
        bank: doc.refundAccount.bank ?? "",
        holderMasked: maskName(doc.refundAccount.holder ?? ""),
        accountMasked: maskAccount(doc.refundAccount.account ?? ""),
      }
    : null;

  const paymentMeta = normalizeRentalPaymentMeta(doc);
  const servicePickupMethod = normalizeServicePickupMethod((doc as any).servicePickupMethod);

  let linkedApplicationStatus: string | null = null;
  let linkedApplicationReceptionLabel: string | null = null;
  let linkedApplicationRacketCount: number | null = null;
  let linkedApplicationTensionSummary: string | null = null;
  let linkedApplicationStringNames: string[] = [];
  let linkedApplicationReservationLabel: string | null = null;
  let linkedApplication: Record<string, unknown> | null = null;

  const rawStringingApplicationId = (doc as any).stringingApplicationId;
  const normalizedApplicationId = String(rawStringingApplicationId ?? "");
  const applicationObjectId = ObjectId.isValid(normalizedApplicationId)
    ? new ObjectId(normalizedApplicationId)
    : null;
  const applicationLinks: Record<string, unknown>[] = [
    { rentalId: doc._id },
    { rentalId: id },
    { paymentSource: `rental:${id}` },
  ];
  if (applicationObjectId) applicationLinks.unshift({ _id: applicationObjectId });

  const linkedApp = await db.collection("stringing_applications").findOne(
    { $or: applicationLinks },
    {
      projection: {
        status: 1,
        collectionMethod: 1,
        stringDetails: 1,
        stringNames: 1,
        applicationSummary: 1,
        requirements: 1,
        paymentSource: 1,
        rentalId: 1,
        meta: 1,
      },
    },
  );
  linkedApplicationStatus = typeof linkedApp?.status === "string" ? linkedApp.status : null;
  if (linkedApp) {
    const lines = getApplicationLines((linkedApp as any).stringDetails);
    linkedApplicationReceptionLabel = getReceptionLabel((linkedApp as any).collectionMethod);
    linkedApplicationRacketCount = lines.length;
    linkedApplicationTensionSummary = getTensionSummary(lines);
    linkedApplicationStringNames = getStringNameCandidates(
      lines.map((line: any) => line?.stringName),
      (linkedApp as any).stringNames,
      (linkedApp as any).applicationSummary?.stringNames,
    );
    const preferredDate = String((linkedApp as any)?.stringDetails?.preferredDate ?? "").trim();
    const preferredTime = String((linkedApp as any)?.stringDetails?.preferredTime ?? "").trim();
    linkedApplicationReservationLabel =
      preferredDate && preferredTime ? `${preferredDate} ${preferredTime}` : null;
    linkedApplication = {
      id: String(linkedApp._id),
      status: linkedApplicationStatus,
      paymentSource: (linkedApp as any).paymentSource ?? null,
      rentalId: (linkedApp as any).rentalId ? String((linkedApp as any).rentalId) : null,
      requirements: (linkedApp as any).requirements ?? null,
      selectedGauge: (linkedApp as any)?.meta?.selectedGauge ?? null,
      selectedColor:
        (linkedApp as any)?.meta?.selectedColorLabel ??
        (linkedApp as any)?.meta?.selectedColor ??
        null,
      lines: lines.map((line: any) => ({
        stringName: line?.stringName ?? null,
        tensionMain: line?.tensionMain ?? null,
        tensionCross: line?.tensionCross ?? null,
        note: line?.note ?? null,
      })),
    };
  }

  return NextResponse.json({
    id: doc._id.toString(),
    racketId: doc.racketId?.toString?.(),
    brand: doc.brand,
    model: doc.model,
    days: doc.days,
    status: typeof doc.status === "string" ? doc.status.toLowerCase() : doc.status,
    amount: doc.amount, // { deposit, fee, stringPrice?, stringingFee?, total }
    createdAt: doc.createdAt,
    outAt: doc.outAt ?? null,
    dueAt: doc.dueAt ?? null,
    returnedAt: doc.returnedAt ?? null,
    depositRefundedAt: doc.depositRefundedAt ?? null,

    // 대여 기반 교체 서비스 신청서 연결 정보 (있으면 관리자 상세에서 CTA 노출 가능)
    isStringServiceApplied: !!(doc as any).isStringServiceApplied,
    stringing: (doc as any).stringing ?? null,
    stringingApplicationId: linkedApplication?.id ?? (doc as any).stringingApplicationId ?? null,
    stringingApplicationStatus: linkedApplicationStatus,
    linkedStringingApplication: linkedApplication,
    stringingReceptionLabel: linkedApplicationReceptionLabel,
    stringingRacketCount: linkedApplicationRacketCount,
    stringingTensionSummary: linkedApplicationTensionSummary,
    stringingNames: linkedApplicationStringNames.length
      ? linkedApplicationStringNames
      : getRentalStringNames(doc),
    stringingReservationLabel: linkedApplicationReservationLabel,
    paymentStatusLabel: paymentMeta.label,
    paymentStatusSource: paymentMeta.source,
    paymentStatus: doc.paymentStatus ?? null,
    paymentMethod: doc.paymentInfo?.method ?? null,
    paymentProvider: doc.paymentInfo?.provider ?? null,
    paymentTid: doc.paymentInfo?.tid ?? null,
    paymentCardDisplayName: doc.paymentInfo?.cardDisplayName ?? null,
    paymentCardCompany:
      doc.paymentInfo?.cardCompany ??
      doc.paymentInfo?.niceCard?.issuerName ??
      doc.paymentInfo?.rawSummary?.card?.issuerName ??
      null,
    paymentCardLabel:
      doc.paymentInfo?.cardLabel ??
      doc.paymentInfo?.niceCard?.cardName ??
      doc.paymentInfo?.rawSummary?.card?.cardName ??
      null,
    paymentNiceSync: doc.paymentInfo?.niceSync ?? null,
    servicePickupMethod,
    pickupMethodLabel: getPickupMethodLabel(servicePickupMethod),

    shipping: {
      outbound: normalizeShippingSide(doc.shipping?.outbound),
      return: normalizeShippingSide(doc.shipping?.return),
    },
    cancelRequest: doc.cancelRequest ?? null, // 취소 요청 정보(있으면 그대로, 없으면 null)
    stockDeduction: (doc as any).stockDeduction ?? (doc as any).stringing?.stockDeduction ?? null,
    stockRestore: (doc as any).stockRestore ?? (doc as any).stringing?.stockRestore ?? null,
    latestHistory: latestHistory
      ? {
          action: latestHistory.action ?? null,
          from: latestHistory.from ?? null,
          to: latestHistory.to ?? null,
          at: latestHistory.at ?? null,
          actor: latestHistory.actor ?? null,
        }
      : null,
    refundAccount, // 관리자만 확인 가능(마스킹)
    user,
  });
}
