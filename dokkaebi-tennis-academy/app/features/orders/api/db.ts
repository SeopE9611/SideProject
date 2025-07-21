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
      let customer: { name: string; email: string; phone: string };

      if (order.userSnapshot) {
        const userDoc = order.userId ? await usersColl.findOne({ _id: new ObjectId(order.userId) }) : null;
        const isDeleted = !!userDoc?.isDeleted;
        customer = {
          name: isDeleted ? `${order.userSnapshot.name} (탈퇴한 회원)` : order.userSnapshot.name,
          email: order.userSnapshot.email,
          phone: '-',
        };
      } else if (order.guestInfo) {
        customer = {
          name: `${order.guestInfo.name} (비회원)`,
          email: order.guestInfo.email || '-',
          phone: order.guestInfo.phone || '-',
        };
      } else {
        customer = { name: '(고객 정보 없음)', email: '-', phone: '-' };
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
      };
    })
  );

  // 스트링 교체 서비스 신청서 불러오기
  const rawApps = await db.collection('stringing_applications').find().toArray();

  // 수정: 비동기 매핑으로 items 재구성
  const stringingOrders = await Promise.all(
    rawApps.map(async (app) => {
      // 1) 고객 정보 매핑 (기존 로직 그대로)
      const customer = app.userSnapshot?.name
        ? { name: app.userSnapshot.name, email: app.userSnapshot.email ?? '-', phone: '-' }
        : {
            name: `${app.guestName ?? '비회원'} (비회원)`,
            email: app.guestEmail || '-',
            phone: app.guestPhone || '-',
          };

      // 2) items 배열 재구성
      const items = await Promise.all(
        (app.stringDetails.stringTypes ?? []).map(async (typeId: string) => {
          // 커스텀 스트링 처리
          if (typeId === 'custom') {
            return {
              id: 'custom',
              name: app.stringDetails.customStringName ?? '커스텀 스트링',
              price: 15000, // POST 핸들러에도 동일한 기본요금 사용
              quantity: 1,
            };
          }

          // DB에서 이름·mountingFee 조회
          const prod = await db.collection('products').findOne({ _id: new ObjectId(typeId) }, { projection: { name: 1, mountingFee: 1 } });
          return {
            id: typeId,
            name: prod?.name ?? '알 수 없는 상품',
            price: prod?.mountingFee ?? 0,
            quantity: 1,
          };
        })
      );

      // 3) totalPrice 재계산 (items 기반)
      const totalCalculated = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

      return {
        id: app._id.toString(),
        linkedOrderId: app.orderId?.toString() ?? null,
        __type: 'stringing_application' as const,
        customer,
        userId: app.userId ? app.userId.toString() : null,
        date: app.createdAt,
        status: app.status,
        paymentStatus: app.paymentStatus || '결제대기',
        type: '서비스',
        total: totalCalculated, // app.totalPrice 대신 재계산된 값
        items, // 방금 만들어낸 배열
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
  );

  // 일반 주문 + 스트링 신청 통합 후 날짜 내림차순 정렬
  const combined = [...orders, ...stringingOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return combined;
}
