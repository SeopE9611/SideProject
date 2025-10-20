// 목적: 주문(orders) 문서를 기반으로 스트링 교체 서비스 신청서를 자동 생성
// - 스키마 대수술 없이 최소 필드만 복제/연결
// - 결제는 "자재"에 한정되어 있을 수 있으므로 servicePaid=false로 시작(후속단계에서 금액 확정 로직 보강 예정)

import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

// 주문 DB 타입의 최소 참조용(있는 필드만 사용)
type DBOrderLite = {
  _id: ObjectId;
  userId?: ObjectId;
  shippingInfo?: {
    name: string;
    phone: string;
    address: string;
    addressDetail?: string;
    postalCode: string;
    depositor?: string;
    deliveryRequest?: string;
    shippingMethod?: string; // '택배수령' | '방문수령' 등
    estimatedDate?: string; // 희망일(있다면)
    withStringService?: boolean;
  };
  createdAt?: Date;
  servicePickupMethod?: 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT';
};

// 신청서에 저장할 최소 스냅샷 타입(필요 필드만)
type CreateAppDoc = {
  orderId: ObjectId; // 주문 ↔ 신청서 연결고리
  userId?: ObjectId | null; // 회원이면 연결, 비회원이면 null
  createdAt: Date; // 신청서 생성시각
  status: string; // 초기 상태
  servicePaid: boolean; // 공임 결제 여부(초기 false)
  serviceAmount: number; // 결제된 공임금액(초기 0)
  paymentSource?: string; // 예: 'order:<id>'
  shippingInfo?: {
    name: string;
    phone: string;
    address: string;
    addressDetail?: string;
    postalCode: string;
    depositor?: string;
    deliveryRequest?: string;
    shippingMethod?: string;
    estimatedDate?: string;
  };
  // stringDetails 등은 후속단계에서 보강(자재-서비스 페어링/하이브리드)
  history?: Array<{ status: string; date: Date; description: string }>;
  // 신청서 프리필/추적용 메타
  meta?: {
    fromOrder?: boolean;
    servicePickupMethod?: 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT';
  };
};

export async function createStringingApplicationFromOrder(order: DBOrderLite) {
  const client = await clientPromise;
  const db = client.db();

  // 1) 방어로직: 이미 동일 orderId로 생성된 신청서가 있으면 중복 생성 방지
  const exists = await db.collection('stringing_applications').findOne({ orderId: order._id });
  if (exists) return exists; // 멱등성(idempotency) 보장

  // 픽업 방식 정규화(기본 SELF_SEND)
  const pickup = order.servicePickupMethod === 'SHOP_VISIT' ? 'SHOP_VISIT' : order.servicePickupMethod === 'COURIER_VISIT' ? 'COURIER_VISIT' : 'SELF_SEND';

  // 2) 신청서 문서 구성(최소 필드만)
  const doc: CreateAppDoc = {
    orderId: order._id,
    userId: order.userId ?? null,
    createdAt: new Date(),
    status: 'draft', // 주문 직후에는 '초안' 상태로만 생성
    servicePaid: false, // 1단계: 공임은 아직 미결로 시작(후속 단계에서 확정)
    serviceAmount: 0,
    paymentSource: `order:${order._id.toString()}`,
    shippingInfo: order.shippingInfo
      ? {
          name: order.shippingInfo.name,
          phone: order.shippingInfo.phone,
          address: order.shippingInfo.address,
          addressDetail: order.shippingInfo.addressDetail,
          postalCode: order.shippingInfo.postalCode,
          depositor: order.shippingInfo.depositor,
          deliveryRequest: order.shippingInfo.deliveryRequest,
          shippingMethod: order.shippingInfo.shippingMethod,
          estimatedDate: order.shippingInfo.estimatedDate,
        }
      : undefined,
    history: [{ status: 'draft', date: new Date(), description: '주문 기반 자동 초안 생성' }],
    meta: { fromOrder: true, servicePickupMethod: pickup },
  };

  // 3) DB 저장
  const result = await db.collection('stringing_applications').insertOne(doc as any);

  // 4) 새 문서 반환
  return { _id: result.insertedId, ...doc };
}
