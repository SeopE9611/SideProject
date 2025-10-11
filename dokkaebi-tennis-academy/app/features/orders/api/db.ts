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
      };
    })
  );

  // 스트링 교체 서비스 신청서 불러오기
  // draft 제외 + 필수 참조(orderId, userId) 없는 고아 문서 제외
  const rawApps = await db
    .collection('stringing_applications')
    .find({
      status: { $ne: 'draft' },
      orderId: { $exists: true, $ne: null },
      userId: { $exists: true, $ne: null },
    })
    .toArray();
  const stringingOrders = (
    await Promise.all(
      rawApps.map(async (app) => {
        // (선택) 최후 방어 — 혹시 누락되면 스킵
        if (!app?.orderId || !app?.userId) return null;

        // 고객 정보
        const customer = app.customer
          ? { name: app.customer.name, email: app.customer.email ?? '-', phone: app.customer.phone ?? '-' }
          : app.userSnapshot?.name
          ? { name: app.userSnapshot.name, email: app.userSnapshot.email ?? '-', phone: '-' }
          : { name: `${app.guestName ?? '비회원'} (비회원)`, email: app.guestEmail || '-', phone: app.guestPhone || '-' };

        // items 계산 (이미 적용한 옵셔널 체이닝 유지)
        const items = await Promise.all(
          (app.stringDetails?.stringTypes ?? []).map(async (typeId: string) => {
            if (typeId === 'custom') {
              // 프런트 표시와 동일한 규칙(커스텀=1.5만)으로 아이템 렌더
              return { id: 'custom', name: app.stringDetails?.customStringName ?? '커스텀 스트링', price: 15_000, quantity: 1 };
            }
            const prod = await db.collection('products').findOne({ _id: new ObjectId(typeId) }, { projection: { name: 1, mountingFee: 1 } });
            return { id: typeId, name: prod?.name ?? '알 수 없는 상품', price: prod?.mountingFee ?? 0, quantity: 1 };
          })
        );

        // 재계산 값(과거 데이터 호환용)
        const totalCalculated = items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);

        // 저장값 우선 원칙: 문서에 totalPrice가 존재하면 그 값을 사용
        const totalFromDoc = typeof (app as any).totalPrice === 'number' ? (app as any).totalPrice : null;

        return {
          id: app._id.toString(),
          linkedOrderId: app.orderId?.toString() ?? null,
          __type: 'stringing_application' as const,
          customer,
          userId: app.userId ? app.userId.toString() : null,
          date: app.createdAt,
          status: app.status,
          paymentStatus: app.paymentStatus ?? (app.status && app.status !== '검토 중' ? '결제완료' : '결제대기'),
          type: '서비스',
          total: totalFromDoc ?? totalCalculated,
          items,
          shippingInfo: {
            name: customer.name,
            phone: customer.phone,
            address: app.shippingInfo?.address ?? '-',
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
        };
      })
    )
  ).filter(Boolean); // ← null 제거

  // 일반 주문 + 스트링 신청 통합 후 날짜 내림차순 정렬
  // 날짜 없으면 0으로 간주해서 정렬
  const toTime = (d: any) => (d ? new Date(d as any).getTime() : 0);
  const combined = [...orders, ...(stringingOrders as any[])].sort((a: any, b: any) => toTime(b?.date) - toTime(a?.date));

  return combined;
}
