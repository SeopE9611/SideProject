import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { cookies } from "next/headers";
import { ObjectId, type Document } from "mongodb";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import {
  getAcademyApplicationStatusLabel,
  getAcademyCurrentLevelLabel,
  getAcademyLessonTypeLabel,
} from "@/lib/types/academy";
/**
 * Query 숫자 파라미터 안전 파싱 (NaN/Infinity/음수 방지)
 * - 비정상 값이면 defaultValue 적용
 * - min/max 범위로 clamp
 */
function parseIntParam(
  v: string | null,
  opts: { defaultValue: number; min: number; max: number },
) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

/**
 * Mongo ObjectId 안전 변환
 * - ObjectId면 그대로 반환
 * - string/기타는 유효할 때만 ObjectId로 변환
 */
function toObjectIdMaybe(v: any): ObjectId | null {
  if (!v) return null;
  if (v instanceof ObjectId) return v;
  const s = String(v);
  if (!ObjectId.isValid(s)) return null;
  return new ObjectId(s);
}

function getApplicationLines(stringDetails: any): any[] {
  // 통합 플로우 우선(lines) + 레거시(racketLines) fallback
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines))
    return stringDetails.racketLines;
  return [];
}

function toISOStringMaybe(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function getCreatedAtTime(doc: Document): number {
  const date = new Date(doc.createdAt ?? 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function serializeAcademyApplication(doc: Document) {
  const status = typeof doc.status === "string" ? doc.status : "submitted";
  const desiredLessonType =
    typeof doc.desiredLessonType === "string" ? doc.desiredLessonType : null;
  const currentLevel =
    typeof doc.currentLevel === "string" ? doc.currentLevel : null;

  return {
    _id: doc._id.toString(),
    id: doc._id.toString(),
    kind: "academy_lesson",
    type: "아카데미 레슨 신청",
    title: "아카데미 레슨 신청",
    applicantName:
      typeof doc.applicantName === "string" ? doc.applicantName : null,
    phone: typeof doc.phone === "string" ? doc.phone : null,
    appliedAt: toISOStringMaybe(doc.createdAt) ?? new Date(0).toISOString(),
    status,
    statusLabel: getAcademyApplicationStatusLabel(status),
    desiredLessonType,
    desiredLessonTypeLabel: getAcademyLessonTypeLabel(desiredLessonType),
    currentLevel,
    currentLevelLabel: getAcademyCurrentLevelLabel(currentLevel),
    preferredDays: toStringArray(doc.preferredDays),
    preferredTimeText:
      typeof doc.preferredTimeText === "string" ? doc.preferredTimeText : null,
    lessonGoal: typeof doc.lessonGoal === "string" ? doc.lessonGoal : null,
    requestMemo: typeof doc.requestMemo === "string" ? doc.requestMemo : null,
    customerMessage:
      typeof doc.customerMessage === "string" && doc.customerMessage.trim()
        ? doc.customerMessage
        : null,
    createdAt: toISOStringMaybe(doc.createdAt),
    updatedAt: toISOStringMaybe(doc.updatedAt),
  };
}

export async function GET(req: Request) {
  // 인증
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });
  // verifyAccessToken은 throw 가능 → 500 방지(401로 정리)
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!payload?.sub) return new NextResponse("Unauthorized", { status: 401 });
  // payload.sub → ObjectId 변환은 throw 가능 → 선검증
  const subStr = String(payload.sub);
  if (!ObjectId.isValid(subStr))
    return new NextResponse("Unauthorized", { status: 401 });
  const userId = new ObjectId(subStr);

  // 페이지 파라미터
  const url = new URL(req.url);
  // Query NaN/범위 방지
  const page = parseIntParam(url.searchParams.get("page"), {
    defaultValue: 1,
    min: 1,
    max: 10_000,
  });
  const limit = parseIntParam(url.searchParams.get("limit"), {
    defaultValue: 10,
    min: 1,
    max: 50,
  });
  const skip = (page - 1) * limit;

  // DB 조회: count + paged
  const client = await clientPromise;
  const db = client.db();

  // draft는 마이페이지 목록/카운트에서 제외
  // 서로 다른 컬렉션을 최신순으로 병합한 뒤 페이지네이션하기 위해
  // 각 컬렉션에서 현재 페이지 계산에 필요한 최대치(skip + limit)만 가져온다.
  const pageWindow = skip + limit;
  const academyUserIdFilter = { $in: [subStr, userId] };
  const [stringingTotal, academyTotal, rawStringingList, rawAcademyList] =
    await Promise.all([
      db
        .collection("stringing_applications")
        .countDocuments({ userId, status: { $ne: "draft" } }),
      db
        .collection("academy_lesson_applications")
        .countDocuments({ userId: academyUserIdFilter }),
      db
        .collection("stringing_applications")
        .find({ userId, status: { $ne: "draft" } })
        .sort({ createdAt: -1 })
        .limit(pageWindow)
        .toArray(),
      db
        .collection("academy_lesson_applications")
        .find(
          { userId: academyUserIdFilter },
          {
            projection: {
              applicantName: 1,
              phone: 1,
              desiredLessonType: 1,
              currentLevel: 1,
              preferredDays: 1,
              preferredTimeText: 1,
              lessonGoal: 1,
              requestMemo: 1,
              status: 1,
              customerMessage: 1,
              createdAt: 1,
              updatedAt: 1,
              userId: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .limit(pageWindow)
        .toArray(),
    ]);

  const total = stringingTotal + academyTotal;
  const mergedPage = [
    ...rawStringingList.map((doc) => ({ kind: "stringing" as const, doc })),
    ...rawAcademyList.map((doc) => ({ kind: "academy_lesson" as const, doc })),
  ]
    .sort((a, b) => getCreatedAtTime(b.doc) - getCreatedAtTime(a.doc))
    .slice(skip, skip + limit);

  const rawList = mergedPage
    .filter((item) => item.kind === "stringing")
    .map((item) => item.doc);

  /**
   * order 기반 신청서의 "라켓 포함 여부"를 미리 조회해서 Map으로 만듬
   * - order.items[].kind === 'racket' 이면: 매장 보유 라켓 기반 작업 → 고객 입고/운송장 불필요
   * - 성능을 위해 N+1 대신 $in으로 한 번에 조회
   */
  const orderIdSet = new Set<string>();
  const orderObjectIds: ObjectId[] = [];
  for (const doc of rawList as any[]) {
    const oid = toObjectIdMaybe((doc as any).orderId);
    if (!oid) continue;
    const key = oid.toString();
    if (orderIdSet.has(key)) continue;
    orderIdSet.add(key);
    orderObjectIds.push(oid);
  }

  const orderHasRacketById = new Map<string, boolean>();
  if (orderObjectIds.length > 0) {
    const orders = await db
      .collection("orders")
      .find({ _id: { $in: orderObjectIds } }, { projection: { items: 1 } })
      .toArray();
    for (const o of orders as any[]) {
      const hasRacket =
        Array.isArray(o.items) &&
        o.items.some((it: any) => it?.kind === "racket");
      orderHasRacketById.set(String(o._id), hasRacket);
    }
  }

  // sanitize + stringType 매핑
  const stringingItems = await Promise.all(
    rawList.map(async (doc) => {
      const details: any = (doc as any).stringDetails ?? {};
      const typeIds: string[] = Array.isArray(details.stringTypes)
        ? details.stringTypes
        : [];

      // 스트링 이름 목록 생성 (커스텀/상품명 혼합)
      const names = await Promise.all(
        typeIds.map(async (prodId: string) => {
          if (prodId === "custom") {
            return details.customStringName || "커스텀 스트링";
          }
          const prod = await db
            .collection("products")
            .findOne(
              { _id: new ObjectId(prodId) },
              { projection: { name: 1 } },
            );
          return prod?.name || "알 수 없는 상품";
        }),
      );
      // createdAt 안전 보정
      const appliedAtISO =
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : new Date(doc.createdAt).toISOString();

      // 운송장/수거방식 정보(목록 라벨 전환 근거)
      const trackingNo =
        (doc as any)?.shippingInfo?.selfShip?.trackingNo ??
        (doc as any)?.shippingInfo?.invoice?.trackingNumber ??
        (doc as any)?.shippingInfo?.trackingNumber ??
        null;
      const collectionMethod = normalizeCollection(
        (doc as any)?.shippingInfo?.collectionMethod ??
          (doc as any)?.collectionMethod ??
          "self_ship",
      );
      const hasTracking = Boolean(trackingNo);
      // 비-방문이면 값 null로 내림
      const cm = normalizeCollection(
        (doc as any)?.shippingInfo?.collectionMethod ??
          (doc as any)?.collectionMethod ??
          "self_ship",
      );

      /**
       * 고증 보정 핵심: "고객이 매장으로 보내야 하는 신청인가?"
       * - rental 기반: 매장 라켓 → 고객 입고 불필요
       * - order 기반 + 주문에 racket 포함: 매장 라켓(구매/대여) 기반 → 고객 입고/운송장 불필요
       * - 그 외(단독 신청 / 스트링만 구매 + 서비스 등): 고객 라켓 기반 → 입고 필요
       */
      const orderIdStr = (doc as any).orderId
        ? String((doc as any).orderId)
        : null;
      const fromOrder = Boolean(
        (doc as any).orderId || (doc as any)?.meta?.fromOrder,
      );
      const orderHasRacket =
        fromOrder && orderIdStr
          ? Boolean(orderHasRacketById.get(orderIdStr))
          : false;
      const inboundRequired = (() => {
        if ((doc as any).rentalId) return false;
        if (fromOrder && orderHasRacket) return false;
        return true;
      })();
      const needsInboundTracking =
        inboundRequired && collectionMethod === "self_ship";

      // 취소 요청 정보 정리
      const cancel: any = (doc as any).cancelRequest ?? {};
      // DB에는 '요청' | '승인' | '거절' | undefined 이런 값들이 들어감
      const rawCancelStatus: string = cancel.status ?? "none";

      let cancelReasonSummary: string | null = null;
      if (rawCancelStatus && rawCancelStatus !== "none") {
        if (cancel.reasonCode) {
          // 예: "CHANGE_MIND (다른 상품 구매)" 식으로 한 줄 요약
          cancelReasonSummary =
            cancel.reasonCode +
            (cancel.reasonText ? ` (${cancel.reasonText})` : "");
        } else if (cancel.reasonText) {
          cancelReasonSummary = cancel.reasonText;
        }
      }
      return {
        id: doc._id.toString(),
        type: "스트링 장착 서비스",
        applicantName: doc.name ?? null,
        phone: doc.phone ?? null,
        appliedAt: appliedAtISO,
        status: doc.status ?? "접수",
        // 라켓 종류 요약 문자열
        // 1) stringDetails.racketType 문자열이 있으면 그 값을 우선 사용
        // 2) 없으면 stringDetails.racketLines 배열을 기준으로 라켓 이름들을 합쳐서 보여줌
        racketType: (() => {
          // 1단계: 단일 필드(racketType)에 값이 있으면 그걸 그대로 사용
          if (
            details.racketType &&
            typeof details.racketType === "string" &&
            details.racketType.trim().length > 0
          ) {
            return details.racketType.trim();
          }

          // 2단계: lines 우선 + racketLines fallback으로 요약 생성
          const rawLines = getApplicationLines(details);
          if (rawLines.length === 0) {
            return "-";
          }

          const names = rawLines.map((line: any, index: number) => {
            const rawName =
              (line.racketType && String(line.racketType).trim()) ||
              (line.racketLabel && String(line.racketLabel).trim()) ||
              "";

            // 이름이 하나도 없으면 "라켓1", "라켓2" 형태로 대체
            return rawName || `라켓 ${index + 1}`;
          });

          return names.join(", ");
        })(),

        stringType: names.join(", ") || "-",
        // 방문만 예약 표시, 그 외는 null로 정리
        preferredDate: cm === "visit" ? (details.preferredDate ?? null) : null,
        preferredTime: cm === "visit" ? (details.preferredTime ?? null) : null,

        // 방문 예약 슬롯 정보 (없으면 null)
        visitSlotCount:
          cm === "visit" ? ((doc as any).visitSlotCount ?? null) : null,
        visitDurationMinutes:
          cm === "visit" ? ((doc as any).visitDurationMinutes ?? null) : null,

        requests: details.requirements ?? null,
        shippingInfo: {
          collectionMethod,
          selfShip: { trackingNo },
        },
        hasTracking,

        // 프론트가 "운송장 등록 버튼"을 띄울지 말지 판단할 핵심 플래그
        inboundRequired,
        needsInboundTracking,

        // 이 신청이 연결된 주문 ID (없으면 null)
        orderId: (doc as any).orderId ? String((doc as any).orderId) : null,
        rentalId: (doc as any).rentalId ? String((doc as any).rentalId) : null,

        // 사용자 확정 시각 (없으면 null)
        userConfirmedAt:
          (doc as any).userConfirmedAt instanceof Date
            ? (doc as any).userConfirmedAt.toISOString()
            : typeof (doc as any).userConfirmedAt === "string"
              ? (doc as any).userConfirmedAt
              : null,

        // 마이페이지 목록 카드용 취소 요청 정보
        cancelStatus: rawCancelStatus, //'요청' | '승인' | '거절' | 'none'
        cancelReasonSummary, // 한 줄 요약
      };
    }),
  );

  const stringingItemById = new Map(
    stringingItems.map((item) => [item.id, item]),
  );

  const items = mergedPage
    .map((item) => {
      if (item.kind === "academy_lesson") {
        return serializeAcademyApplication(item.doc);
      }
      const id = item.doc._id.toString();
      return stringingItemById.get(id);
    })
    .filter(Boolean);

  return NextResponse.json({ items, total });
}
