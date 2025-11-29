// 주문 관련 DB 작업 전용 유틸
import clientPromise from '@/lib/mongodb';
import { DBOrder } from '@/lib/types/order-db';
import { ObjectId } from 'mongodb';

// 주문을 DB에 삽입하는 함수
export async function insertOrder(order: DBOrder) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection('orders').insertOne(order);
}

// 사용자 정보를 userId로 찾아서 스냅샷으로 반환
export async function findUserSnapshot(userId: string) {
  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user) return null;

  return {
    name: user.name || '(탈퇴한 회원)',
    email: user.email || '(탈퇴한 회원)',
  };
}

// 관리자 주문 목록 조회 + 변환
export async function fetchCombinedOrders() {
  const client = await clientPromise;
  const db = client.db();

  // 일반 상품 주문 불러오기
  const rawOrders = await db.collection('orders').find().toArray();

  const usersColl = db.collection('users');

  const orders = await Promise.all(
    rawOrders.map(async (order) => {
      const customer: { name: string; email: string; phone: string } = order.customer
        ? { name: order.customer.name, email: order.customer.email ?? '-', phone: order.customer.phone ?? '-' }
        : order.userSnapshot
        ? { name: order.userSnapshot.name, email: order.userSnapshot.email ?? '-', phone: '-' }
        : order.guestInfo
        ? { name: `${order.guestInfo.name} (비회원)`, email: order.guestInfo.email ?? '-', phone: order.guestInfo.phone ?? '-' }
        : { name: '(고객 정보 없음)', email: '-', phone: '-' };

      // 원본 상태 문자열 (한글/영문 섞여 있을 수 있음)
      const rawCancelStatus = order.cancelRequest?.status as string | undefined;

      // 한글/영문 모두 지원해서 공통 코드로 정규화
      let cancelStatus: 'requested' | 'approved' | 'rejected' | undefined;

      if (rawCancelStatus === 'requested' || rawCancelStatus === '요청') {
        cancelStatus = 'requested';
      } else if (rawCancelStatus === 'approved' || rawCancelStatus === '승인') {
        cancelStatus = 'approved';
      } else if (rawCancelStatus === 'rejected' || rawCancelStatus === '거절') {
        cancelStatus = 'rejected';
      } else {
        cancelStatus = undefined;
      }

      return {
        id: order._id.toString(),
        __type: 'order' as const,
        customer,
        userId: order.userId ? order.userId.toString() : null,
        date: order.createdAt,
        status: order.status || '대기중',
        paymentStatus: order.paymentStatus || '결제대기',
        type: '상품',
        total: order.totalPrice,
        items: order.items || [],
        shippingInfo: {
          name: order.shippingInfo.name,
          phone: order.shippingInfo.phone,
          address: order.shippingInfo.address,
          addressDetail: order.shippingInfo.addressDetail ?? '-',
          postalCode: order.shippingInfo.postalCode,
          depositor: order.shippingInfo.depositor,
          deliveryRequest: order.shippingInfo.deliveryRequest,
          shippingMethod: order.shippingInfo.shippingMethod,
          estimatedDate: order.shippingInfo.estimatedDate,
          withStringService: order.shippingInfo.withStringService ?? false,
          invoice: {
            courier: order.shippingInfo.invoice?.courier ?? null,
            trackingNumber: order.shippingInfo.invoice?.trackingNumber ?? null,
          },
        },
        cancelStatus,
      };
    })
  );

  // 스트링 교체 서비스 신청서 불러오기
  // draft 제외 + 필수 참조(orderId, userId) 없는 고아 문서 제외
  const rawApps = await db
    .collection('stringing_applications')
    .find({
      status: { $ne: 'draft' },
      // orderId: { $exists: true, $ne: null },
      // userId: { $exists: true, $ne: null },
    })
    .toArray();
  const stringingOrders = (
    await Promise.all(
      rawApps.map(async (app) => {
        // (선택) 최후 방어 — 혹시 누락되면 스킵
        // if (!app?.orderId || !app?.userId) return null;

        // 고객 정보
        const customer = app.customer
          ? { name: app.customer.name, email: app.customer.email ?? '-', phone: app.customer.phone ?? '-' }
          : app.userSnapshot?.name
          ? { name: app.userSnapshot.name, email: app.userSnapshot.email ?? '-', phone: '-' }
          : { name: `${app.guestName ?? '비회원'} (비회원)`, email: app.guestEmail || '-', phone: app.guestPhone || '-' };

        // 상품 아이템
        const items = await Promise.all(
          (app.stringDetails?.stringTypes ?? []).map(async (typeId: string) => {
            if (typeId === 'custom') {
              return { id: 'custom', name: app.stringDetails?.customStringName ?? '커스텀 스트링', price: 15_000, quantity: 1 };
            }
            const prod = await db.collection('products').findOne({ _id: new ObjectId(typeId) }, { projection: { name: 1, mountingFee: 1 } });
            return { id: typeId, name: prod?.name ?? '알 수 없는 상품', price: prod?.mountingFee ?? 0, quantity: 1 };
          })
        );
        // 총액(문서 저장값 우선, 없으면 계산값)
        const totalFromDoc = typeof (app as any).totalPrice === 'number' ? (app as any).totalPrice : null;
        const totalCalculated = items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);

        // 장착 상품 요약 문자열 (첫 상품 + 종수/총수량)
        let stringSummary: string | undefined;
        if (items.length > 0) {
          const [first, ...rest] = items;
          const totalQty = items.reduce((sum, it) => sum + (it.quantity ?? 1), 0);

          if (rest.length === 0) {
            // 상품 1종만 있을 때: "이름 N개"
            stringSummary = `${first.name} ${first.quantity ?? 1}개`;
          } else {
            // 여러 종일 때: "이름 외 N종 · 총 M개"
            stringSummary = `${first.name} 외 ${rest.length}종 · 총 ${totalQty}개`;
          }
        }

        // 신청서 쪽 원본 상태 문자열
        const rawAppCancelStatus = (app as any).cancelRequest?.status as string | undefined;

        let cancelStatus: 'requested' | 'approved' | 'rejected' | undefined;

        if (rawAppCancelStatus === 'requested' || rawAppCancelStatus === '요청') {
          cancelStatus = 'requested';
        } else if (rawAppCancelStatus === 'approved' || rawAppCancelStatus === '승인') {
          cancelStatus = 'approved';
        } else if (rawAppCancelStatus === 'rejected' || rawAppCancelStatus === '거절') {
          cancelStatus = 'rejected';
        } else {
          cancelStatus = undefined;
        }

        return {
          id: app._id.toString(),
          linkedOrderId: app.orderId?.toString() ?? null, // ← 단독 신청서는 null
          __type: 'stringing_application' as const,
          customer,
          userId: app.userId ? app.userId.toString() : null, // 비회원 null 허용
          date: app.createdAt,
          status: app.status,
          paymentStatus: app.paymentStatus ?? '결제대기',
          type: '서비스',
          total: totalFromDoc ?? totalCalculated,
          items,
          stringSummary,
          shippingInfo: {
            name: customer.name,
            phone: customer.phone,
            address: app.shippingInfo?.address ?? '-',
            addressDetail: app.shippingInfo?.addressDetail ?? '-', // 누락 방어
            postalCode: app.shippingInfo?.postalCode ?? '-',
            depositor: app.shippingInfo?.depositor ?? '-',
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
        };
      })
    )
  ).filter(Boolean); // ← null 제거

  // 일반 주문 + 스트링 신청 통합 후 날짜 내림차순 정렬
  // 날짜 없으면 0으로 간주해서 정렬
  const toTime = (d: any) => (d ? new Date(d as any).getTime() : 0);

  // 현재 관리자/사용자 주문 목록에서는
  // "일반 주문 + 스트링 교체 서비스 신청(stringing_applications)"만 통합해서 사용한다.
  // 라켓 대여 주문(rental_orders)은 전용 관리자 페이지(/admin/rentals) 및
  // 관련 API(/api/admin/rentals, /api/me/rentals 등)에서 별도로 관리하므로
  // 여기서는 포함하지 않는다.
  // 혹시라도 통합 관리기능이 도입될 방지를 위해 주석처리

  /*  // rental_orders를 정규화하여 append
  const rentalDocs = await db.collection('rental_orders').find().toArray();

  const rentalOrders = await Promise.all(
    rentalDocs.map(async (r: any) => {
      // 라켓 기본 정보 조회(브랜드/모델명)
      const rak = await db.collection('used_rackets').findOne({ _id: r.racketId });

      // 고객 표기 (비회원이면 guestInfo 그대로 표시)
      const customer = r.guestInfo
        ? {
            name: `${r.guestInfo.name ?? '비회원'}`,
            email: r.guestInfo.email ?? '-',
            phone: r.guestInfo.phone ?? '-',
          }
        : await findUserSnapshot(r.userId?.toString());

      // 상태/뱃지 라벨 간단 매핑(기존 팔레트 사용 전제)
      const mapRentalToBadge = (s: string) => {
        switch (s) {
          case 'paid':
          case 'shipped':
          case 'in_use':
            return '진행중';
          case 'returned':
            return '반납완료';
          case 'late':
            return '연체';
          case 'lost':
          case 'damaged':
            return '이슈';
          default:
            return '대기';
        }
      };

      return {
        id: r._id.toString(),
        __type: 'rental_order' as const,

        customer,
        userId: r.userId?.toString?.() ?? null,

        // 날짜 정렬 기준: createdAt (출고/수령 기반 정렬은 후속 단계에서)
        date: r.createdAt ?? null,

        // 기존 목록 컬럼과 호환되는 필드명 유지
        status: mapRentalToBadge(r.status),
        paymentStatus: r.status === 'paid' ? '결제완료' : '결제대기',
        type: '대여',

        // 관리자가 한눈에 보기 쉽게 수수료+보증금 합계(표시용)
        total: Number(r.fee ?? 0) + Number(r.deposit ?? 0),

        items: [
          {
            id: rak?._id?.toString?.() ?? '',
            name: `${rak?.brand ?? ''} ${rak?.model ?? ''} (대여 ${r.period}일)`,
            price: Number(r.fee ?? 0),
            quantity: 1,
          },
        ],

        // 운송장/주소 구조는 추후 표준화(지금은 그대로 전달)
        shippingInfo: r.shipping ?? null,
      };
    })
  );
*/
  const combined = [...orders, ...(stringingOrders as any[])].sort((a: any, b: any) => toTime(b?.date) - toTime(a?.date));
  return combined;
}
