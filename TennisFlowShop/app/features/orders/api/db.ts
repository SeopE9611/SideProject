// 주문 관련 DB 작업 전용 유틸
import clientPromise from "@/lib/mongodb";
import { DBOrder } from "@/lib/types/order-db";
import { ObjectId } from "mongodb";
import {
  normalizeOrderStatus,
  normalizePaymentStatus,
} from "@/lib/admin-ops-normalize";
import { normalizeOrderShippingMethod } from "@/lib/order-shipping";
import { getRefundBankLabel } from "@/lib/cancel-request/refund-account";

function hasRefundAccount(account: any): boolean {
  if (!account || typeof account !== "object") return false;
  const bank = String(account.bank ?? "").trim();
  const number = String(account.account ?? "").trim();
  const holder = String(account.holder ?? "").trim();
  return Boolean(bank && number && holder);
}

function resolveRefundBankLabel(account: any): string | null {
  if (!account || typeof account !== "object") return null;
  const bank = String(account.bank ?? "").trim();
  if (!bank) return null;
  return getRefundBankLabel(bank);
}

// 주문을 DB에 삽입하는 함수
export async function insertOrder(order: DBOrder) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("orders").insertOne(order);
}

// 사용자 정보를 userId로 찾아서 스냅샷으로 반환
export async function findUserSnapshot(userId: string) {
  const client = await clientPromise;
  const db = client.db();

  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });
  if (!user) return null;

  return {
    name: user.name || "(탈퇴한 회원)",
    email: user.email || "(탈퇴한 회원)",
  };
}

// 관리자 주문 목록 조회 + 변환
export async function fetchCombinedOrders(opts?: {
  userId?: ObjectId;
  isAdmin?: boolean;
}) {
  const client = await clientPromise;
  const db = client.db();

  // /api/orders는 공용으로 호출될 수 있으므로, 기본적으로 사용자 스코프를 강제합니다.
  // - admin: 전체 조회
  // - non-admin: 본인 userId 기반 필터
  const isAdmin = opts?.isAdmin === true;
  const userId = opts?.userId;

  const orderQuery = !isAdmin && userId ? { userId } : {};
  const stringingQuery = !isAdmin && userId ? { userId } : {};

  // 필요한 필드만 가져오고, 생성일 내림차순으로 정렬(서버에서 1차 정렬)
  const rawOrders = await db
    .collection("orders")
    .find(orderQuery, {
      projection: {
        _id: 1,
        customer: 1,
        userSnapshot: 1,
        guestInfo: 1,
        userId: 1,
        createdAt: 1,
        status: 1,
        paymentStatus: 1,
        paymentInfo: 1,
        totalPrice: 1,
        items: 1,
        shippingInfo: 1,
        cancelRequest: 1,
      },
    })
    .sort({ createdAt: -1 })
    .toArray();

  // 날짜 정렬/표시 안전화: Invalid Date → 0 처리
  const safeToTime = (d: any) => {
    const t = new Date(d as any).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const orders = await Promise.all(
    rawOrders.map(async (order) => {
      const customer: { name: string; email: string; phone: string } =
        order.customer
          ? {
              name: order.customer.name,
              email: order.customer.email ?? "-",
              phone: order.customer.phone ?? "-",
            }
          : order.userSnapshot
            ? {
                name: order.userSnapshot.name,
                email: order.userSnapshot.email ?? "-",
                phone: "-",
              }
            : order.guestInfo
              ? {
                  name: `${order.guestInfo.name} (비회원)`,
                  email: order.guestInfo.email ?? "-",
                  phone: order.guestInfo.phone ?? "-",
                }
              : { name: "(고객 정보 없음)", email: "-", phone: "-" };

      // 원본 상태 문자열 (한글/영문 섞여 있을 수 있음)
      const rawCancelStatus = order.cancelRequest?.status as string | undefined;
      const refundAccount =
        (order as any)?.cancelRequest?.refundAccount ?? null;

      // 한글/영문 모두 지원해서 공통 코드로 정규화
      let cancelStatus: "requested" | "approved" | "rejected" | undefined;

      if (rawCancelStatus === "requested" || rawCancelStatus === "요청") {
        cancelStatus = "requested";
      } else if (rawCancelStatus === "approved" || rawCancelStatus === "승인") {
        cancelStatus = "approved";
      } else if (rawCancelStatus === "rejected" || rawCancelStatus === "거절") {
        cancelStatus = "rejected";
      } else {
        cancelStatus = undefined;
      }

      const si: any = (order as any)?.shippingInfo ?? {};
      const invoice: any = si?.invoice ?? {};

      const normalizedFromDelivery = (() => {
        // deliveryMethod(방문수령/택배수령 등)를 courier/visit/quick으로 정규화
        const code = normalizeOrderShippingMethod(si?.deliveryMethod);
        // courier는 기존 시스템에서 delivery로 저장하므로 delivery로 매핑
        if (code === "courier") return "delivery";
        // quick은 quick 그대로
        if (code === "quick") return "quick";
        // visit은 visit 그대로
        if (code === "visit") return "visit";
        // 알 수 없으면 undefined → 선택 없음 처리로 내려감
        return undefined;
      })();

      const normalizedFromPickup = (() => {
        const pickup = (order as any)?.servicePickupMethod as
          | string
          | undefined;
        if (pickup === "SHOP_VISIT") return "visit";
        if (pickup === "COURIER_VISIT" || pickup === "SELF_SEND")
          return "delivery";
        return undefined;
      })();

      // 결제상태는 order.paymentStatus가 없을 수도 있어서 paymentInfo.status도 fallback(표시용)
      const paymentStatusRaw =
        (order as any)?.paymentStatus ?? (order as any)?.paymentInfo?.status;

      return {
        id: order._id.toString(),
        __type: "order" as const,
        customer,
        userId: order.userId ? order.userId.toString() : null,
        date: order.createdAt,
        status: normalizeOrderStatus((order as any)?.status),
        paymentStatus: normalizePaymentStatus(paymentStatusRaw),
        type: "상품",
        total: order.totalPrice,
        items: order.items || [],
        shippingInfo: {
          // shippingInfo 누락/부분누락 방어
          name: si?.name ?? customer.name ?? "-",
          phone: si?.phone ?? customer.phone ?? "-",
          address: si?.address ?? "-",
          addressDetail: si?.addressDetail ?? "-",
          postalCode: si?.postalCode ?? "-",
          depositor: si?.depositor ?? "-",
          deliveryRequest: si?.deliveryRequest,
          shippingMethod:
            si?.shippingMethod ??
            normalizedFromDelivery ??
            normalizedFromPickup,
          estimatedDate: si?.estimatedDate,
          withStringService: si?.withStringService ?? false,
          invoice: {
            courier: invoice?.courier ?? null,
            trackingNumber: invoice?.trackingNumber ?? null,
          },
        },
        cancelStatus,
        refundAccountReady: cancelStatus
          ? hasRefundAccount(refundAccount)
          : undefined,
        refundBankLabel: cancelStatus
          ? resolveRefundBankLabel(refundAccount)
          : null,
      };
    }),
  );

  // 스트링 교체 서비스 신청서 불러오기
  // draft 제외 + 필수 참조(orderId, userId) 없는 고아 문서 제외
  // 대여 기반 신청서 제외(운영 오판 방지)
  const rawApps = await db
    .collection("stringing_applications")
    .find(
      {
        status: { $ne: "draft" }, // draft 제외
        ...stringingQuery,
        $or: [{ rentalId: { $exists: false } }, { rentalId: null }],
      },
      {
        projection: {
          _id: 1,
          orderId: 1,
          rentalId: 1,
          userId: 1,
          createdAt: 1,
          status: 1,
          paymentStatus: 1,
          customer: 1,
          userSnapshot: 1,
          guestName: 1,
          guestEmail: 1,
          guestPhone: 1,
          stringDetails: 1,
          totalPrice: 1,
          shippingInfo: 1,
          cancelRequest: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .toArray();
  const stringingOrders = (
    await Promise.all(
      rawApps.map(async (app) => {
        // (선택) 최후 방어 — 혹시 누락되면 스킵
        // if (!app?.orderId || !app?.userId) return null;

        // 고객 정보
        const customer = app.customer
          ? {
              name: app.customer.name,
              email: app.customer.email ?? "-",
              phone: app.customer.phone ?? "-",
            }
          : app.userSnapshot?.name
            ? {
                name: app.userSnapshot.name,
                email: app.userSnapshot.email ?? "-",
                phone: "-",
              }
            : {
                name: `${app.guestName ?? "비회원"} (비회원)`,
                email: app.guestEmail || "-",
                phone: app.guestPhone || "-",
              };

        // 상품 아이템
        const items = await Promise.all(
          (app.stringDetails?.stringTypes ?? []).map(async (typeId: string) => {
            if (typeId === "custom") {
              return {
                id: "custom",
                name: app.stringDetails?.customStringName ?? "커스텀 스트링",
                price: 15_000,
                quantity: 1,
              };
            }
            const prod = await db
              .collection("products")
              .findOne(
                { _id: new ObjectId(typeId) },
                { projection: { name: 1, mountingFee: 1 } },
              );
            return {
              id: typeId,
              name: prod?.name ?? "알 수 없는 상품",
              price: prod?.mountingFee ?? 0,
              quantity: 1,
            };
          }),
        );
        // 총액(문서 저장값 우선, 없으면 계산값)
        const totalFromDoc =
          typeof (app as any).totalPrice === "number"
            ? (app as any).totalPrice
            : null;
        const totalCalculated = items.reduce(
          (s, it) => s + (it.price || 0) * (it.quantity || 0),
          0,
        );

        // 장착 상품 요약 문자열 (첫 상품 + 종수/총수량)
        let stringSummary: string | undefined;
        if (items.length > 0) {
          const [first, ...rest] = items;
          const totalQty = items.reduce(
            (sum, it) => sum + (it.quantity ?? 1),
            0,
          );

          if (rest.length === 0) {
            // 상품 1종만 있을 때: "이름 N개"
            stringSummary = `${first.name} ${first.quantity ?? 1}개`;
          } else {
            // 여러 종일 때: "이름 외 N종 · 총 M개"
            stringSummary = `${first.name} 외 ${rest.length}종 · 총 ${totalQty}개`;
          }
        }

        // 신청서 쪽 원본 상태 문자열
        const rawAppCancelStatus = (app as any).cancelRequest?.status as
          | string
          | undefined;
        const appRefundAccount =
          (app as any)?.cancelRequest?.refundAccount ?? null;

        let cancelStatus: "requested" | "approved" | "rejected" | undefined;

        if (
          rawAppCancelStatus === "requested" ||
          rawAppCancelStatus === "요청"
        ) {
          cancelStatus = "requested";
        } else if (
          rawAppCancelStatus === "approved" ||
          rawAppCancelStatus === "승인"
        ) {
          cancelStatus = "approved";
        } else if (
          rawAppCancelStatus === "rejected" ||
          rawAppCancelStatus === "거절"
        ) {
          cancelStatus = "rejected";
        } else {
          cancelStatus = undefined;
        }

        return {
          id: app._id.toString(),
          linkedOrderId: app.orderId?.toString() ?? null, // ← 단독 신청서는 null
          __type: "stringing_application" as const,
          customer,
          userId: app.userId ? app.userId.toString() : null, // 비회원 null 허용
          date: app.createdAt,
          status: app.status,
          paymentStatus: normalizePaymentStatus(
            app.paymentStatus ?? "결제대기",
          ),
          type: "서비스",
          total: totalFromDoc ?? totalCalculated,
          items,
          stringSummary,
          shippingInfo: {
            name: customer.name,
            phone: customer.phone,
            address: app.shippingInfo?.address ?? "-",
            addressDetail: app.shippingInfo?.addressDetail ?? "-", // 누락 방어
            postalCode: app.shippingInfo?.postalCode ?? "-",
            depositor: app.shippingInfo?.depositor ?? "-",
            deliveryRequest: app.shippingInfo?.deliveryRequest,
            shippingMethod: app.shippingInfo?.shippingMethod,
            estimatedDate: app.shippingInfo?.estimatedDate,
            withStringService: true,
            invoice: {
              courier: app.shippingInfo?.invoice?.courier ?? null,
              trackingNumber: app.shippingInfo?.invoice?.trackingNumber ?? null,
            },
          },
          cancelStatus,
          refundAccountReady: cancelStatus
            ? hasRefundAccount(appRefundAccount)
            : undefined,
          refundBankLabel: cancelStatus
            ? resolveRefundBankLabel(appRefundAccount)
            : null,
        };
      }),
    )
  ).filter(Boolean); // ← null 제거

  // 정책 A: /admin/orders(및 공용 목록 API)는 "주문 + 교체서비스 신청"만 다룬다.
  // 대여 주문(rental_orders)은 /admin/rentals 및 전용 API에서만 관리한다.
  // 따라서 이 통합 목록에는 rental_orders를 append하지 않는다.
  const combined = [...orders, ...(stringingOrders as any[])].sort(
    (a: any, b: any) => safeToTime(b?.date) - safeToTime(a?.date),
  );
  return combined;
}
