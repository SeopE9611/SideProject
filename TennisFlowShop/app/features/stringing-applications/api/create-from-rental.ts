// 목적: 대여(rental_orders) 문서를 기반으로 스트링 교체 서비스 신청서를 자동 생성
// - 구매(order) 플로우(create-from-order)와 동일 철학: “결제 문서 1건 ↔ 신청서 1건” 강연결
// - 스키마 대수술 없이 최소 필드만 복제/연결
// - 대여 결제에 공임/스트링 금액이 포함될 수 있으므로 servicePaid는 우선 false로 시작(정책은 3단계에서 UX와 함께 정리)

import { ClientSession, Db, ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

// 대여 DB 타입의 최소 참조용(있는 필드만 사용)
type DBRentalLite = {
  _id: ObjectId;
  userId?: ObjectId;
  createdAt?: Date;

  // 대여 체크아웃에서 결정되는 수거/방문 방식
  servicePickupMethod?: 'SELF_SEND' | 'SHOP_VISIT' | 'COURIER_VISIT';

  // 대여 시 배송/연락처(필요 필드만)
  shipping?: {
    name?: string;
    phone?: string;
    address?: string;
    addressDetail?: string;
    postalCode?: string;
    deliveryRequest?: string;
    shippingMethod?: 'pickup' | 'delivery'; // 레거시
  };

  // 대여에서 선택한 스트링(옵션) — meta에 추적용으로만 남김
  stringing?: {
    requested?: boolean;
    /**
     * 대여 체크아웃에서 넘어오는 stringId는 ObjectId일 수 있음
     * (구매/서비스 쪽은 string을 쓰는 경우가 있어 둘 다 허용)
     */
    stringId?: string | ObjectId;
    // 아래 필드들은 현재 대여 스냅샷이 더 풍부한 형태일 때를 대비한 “허용” (저장에는 강제 사용 X)
    name?: string;
    price?: number;
    mountingFee?: number;
    image?: string | null;
  };

  // 대여 금액 계산 결과(있다면) — serviceAmount에 참고로 반영 가능
  // 실제 필드명이 다를 수 있어 any 접근을 허용하는 형태로 둔다.
  serviceFeeHint?: number;
};

// 신청서에 저장할 최소 스냅샷 타입(필요 필드만)
type CreateAppDoc = {
  rentalId: ObjectId; // 대여 ↔ 신청서 연결고리 (핵심)
  userId?: ObjectId | null;
  createdAt: Date;
  status: string;
  servicePaid: boolean;
  serviceAmount: number;
  paymentSource?: string;
  shippingInfo?: {
    name?: string;
    phone?: string;
    address?: string;
    addressDetail?: string;
    postalCode?: string;
    deliveryRequest?: string;
    shippingMethod?: string;
  };
  history?: Array<{ status: string; date: Date; description: string }>;
  meta?: {
    fromRental?: boolean;
    servicePickupMethod?: 'SELF_SEND' | 'SHOP_VISIT' | 'COURIER_VISIT';
    stringProductId?: string | null;
    stringName?: string | null;
    stringImage?: string | null;
    stringUnitPrice?: number | null;
    mountingFee?: number | null;
    pricingSource?: 'rental' | 'manual';
  };
};

export async function createStringingApplicationFromRental(rental: DBRentalLite, opts?: { db?: Db; session?: ClientSession }): Promise<{ _id: ObjectId }> {
  const db = opts?.db ?? (await clientPromise).db();
  const session = opts?.session;

  type StringingAppDoc = CreateAppDoc;
  const col = db.collection<StringingAppDoc>('stringing_applications');

  /**
   * 멱등(upsert)로 변경
   * - 같은 rentalId로 동시 요청이 들어와도 "한 문서만" 생성되도록 보장
   * - 중복키(E11000)로 트랜잭션이 abort되는 문제를 원천 차단
   *
   * 핵심 포인트:
   * - filter는 { rentalId }만 사용 (대여 1건 ↔ 신청서 1건 “강연결”)
   * - status를 filter에 넣으면, 나중에 status가 draft→submitted로 바뀐 뒤
   *   또 호출되었을 때 새 문서가 생성될 수 있으니(원치 않음) 제외
   */

  // 픽업 방식 정규화(기본 SELF_SEND)
  const pickup = rental.servicePickupMethod === 'SHOP_VISIT' ? 'SHOP_VISIT' : rental.servicePickupMethod === 'COURIER_VISIT' ? 'COURIER_VISIT' : 'SELF_SEND';

  // 2) 신청서 문서 구성(최소 필드만)
  // - 대여 기반은 “이미 대여 결제에 금액이 포함될 수 있음” → 일단 serviceAmount 힌트만 넣고,
  //   실제 UX/정책(결제 표시/스텝)은 3단계에서 rental 모드로 정리
  const doc: CreateAppDoc = {
    rentalId: rental._id,
    userId: rental.userId ?? null,
    createdAt: new Date(),
    status: 'draft',
    servicePaid: false,

    // 대여 쪽 금액 구조가 케이스별로 다를 수 있어 우선 힌트 기반
    // (없으면 0으로 시작)
    serviceAmount: (rental as any).serviceFeeHint ?? (rental as any).serviceFee ?? 0,

    paymentSource: `rental:${rental._id.toString()}`,

    shippingInfo: rental.shipping
      ? {
          name: rental.shipping.name,
          phone: rental.shipping.phone,
          address: rental.shipping.address,
          addressDetail: rental.shipping.addressDetail,
          postalCode: rental.shipping.postalCode,
          deliveryRequest: rental.shipping.deliveryRequest,
          shippingMethod: rental.shipping.shippingMethod,
        }
      : undefined,

    history: [{ status: 'draft', date: new Date(), description: '대여 기반 자동 초안 생성' }],

    meta: {
      fromRental: true,
      servicePickupMethod: pickup,
      stringProductId: rental.stringing?.stringId ? String(rental.stringing.stringId) : null,
      stringName: (rental.stringing as any)?.name ?? null,
      stringImage: (rental.stringing as any)?.image ?? null,
      stringUnitPrice: typeof (rental.stringing as any)?.price === 'number' ? (rental.stringing as any).price : null,
      mountingFee: typeof (rental.stringing as any)?.mountingFee === 'number' ? (rental.stringing as any).mountingFee : null,
      pricingSource: 'rental',
    },
  };

  /**
   * findOneAndUpdate(upsert) + returnDocument 조합이
   * 특정 환경(특히 트랜잭션/세션 포함)에서 value=null로 반환되는 케이스가 있어,
   * “업서트 성공인데도 실패로 오판”되는 문제가 발생할 수 있음.
   *
   * 따라서:
   * 1) updateOne(upsert)로 먼저 쓰기 보장
   * 2) upsertedId가 있으면 그걸 반환
   * 3) upsertedId가 없으면(=기존 문서) findOne으로 _id만 조회해서 반환
   */
  const u = await col.updateOne({ rentalId: rental._id }, { $setOnInsert: doc as any }, { upsert: true, session });

  const upserted = (u as any).upsertedId;
  if (upserted) {
    // 드라이버/환경에 따라 upsertedId 형태가 { _id } 또는 ObjectId일 수 있어 방어
    const id = typeof upserted === 'object' && upserted?._id ? upserted._id : upserted;
    if (id) return { _id: id };
  }

  const existing = await col.findOne({ rentalId: rental._id }, { session, projection: { _id: 1 } });
  if (!existing?._id) throw new Error('UPSERT_STRINGING_APP_FAILED');
  return { _id: existing._id };
}
