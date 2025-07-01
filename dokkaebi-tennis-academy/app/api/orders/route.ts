import { NextRequest, NextResponse } from 'next/server'; // Next.js API 응답 처리를 위한 모듈
import clientPromise from '@/lib/mongodb'; // MongoDB 연결을 위한 클라이언트 프라미스
import { ObjectId } from 'mongodb'; // ObjectId 변환을 위해 추가
import jwt, { JwtPayload } from 'jsonwebtoken';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

// 주문 객체의 타입 정의

type OrderHistoryItem = {
  status: string;
  date: string; // ISO 문자열
  description: string;
};

type ShippingInfo = {
  name: string;
  phone: string;
  address: string;
  addressDetail?: string;
  postalCode: string;
  depositor: string;
  deliveryRequest?: string;
  shippingMethod?: 'courier' | 'quick' | 'visit';
  estimatedDate?: string;
};

type Order = {
  items: any; // 장바구니에 담긴 상품 목록
  shippingInfo: ShippingInfo; // 배송지 정보 (주소, 우편번호 등)
  totalPrice: number; // 총 결제 금액
  shippingFee: number; // 배송비
  createdAt: Date; // 주문 시각
  userId?: string | ObjectId; // 회원일 경우 사용자 ID (세션에서 가져옴)
  invoice?: {
    trackingNumber?: string;
  };
  guestInfo?: {
    // 비회원일 경우 입력한 정보
    name: string;
    phone: string;
    email: string;
  } | null;
  paymentInfo?: {
    method: string;
    bank?: 'shinhan' | 'kookmin' | 'woori';
  };
  status: string;
  userSnapshot?: {
    name: string;
    email: string;
  };
  isStringServiceApplied?: boolean;
};

// POST 메서드 처리 함수 – 주문 생성
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;

    //  클라이언트에서 보낸 요청 body(JSON 형식) 파싱
    const body = await req.json();
    // 요청에서 필요한 필드 구조분해
    const { items, shippingInfo, totalPrice, shippingFee, guestInfo } = body;

    console.log(' [POST /api/orders] 요청 body:', JSON.stringify(body, null, 2));
    console.log('userId:', userId);

    const paymentInfo = {
      method: '무통장입금',
      bank: body.paymentInfo?.bank || 'shinhan',
    };

    // 비회원이면서 guestInfo도 없으면 예외 처리
    if (!userId && !guestInfo) {
      return NextResponse.json({ error: '게스트 주문 정보 누락' }, { status: 400 });
    }

    // 주문 객체 생성 – 기본 필드들만 먼저 채워넣음
    const order: Order = {
      items,
      shippingInfo,
      totalPrice,
      shippingFee,
      guestInfo: guestInfo || null,
      paymentInfo,
      createdAt: new Date(),
      status: '대기중',
      isStringServiceApplied: false,
    };
    console.log(' guestInfo:', guestInfo);
    console.log(' shippingInfo:', shippingInfo);
    //  MongoDB 클라이언트 연결 및 DB 선택
    const client = await clientPromise;
    const db = client.db(); // 기본 DB (보통 .env에서 지정된 DB 사용됨)

    // 로그인된 사용자면 userId 추가 및 userSnapshot 저장
    if (userId) {
      order.userId = new ObjectId(userId); // 문자열 → ObjectId로 변환

      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (user) {
        order.userSnapshot = {
          name: user.name || '(탈퇴한 회원)',
          email: user.email || '(탈퇴한 회원)',
        };
      }
    }

    // 주문 컬렉션에 주문 문서 삽입
    const result = await db.collection('orders').insertOne(order);

    //성공적으로 삽입되었으면 클라이언트에 성공 응답 + orderId 반환
    return NextResponse.json({ success: true, orderId: result.insertedId });
  } catch (error) {
    // 에러 발생 시 서버 콘솔에 출력하고 클라이언트에 실패 응답 반환
    console.error('주문 POST 에러:', error);
    return NextResponse.json({ success: false, error: '주문 생성 중 오류 발생' }, { status: 500 });
  }
}

//  GET 요청 처리: 관리자 주문 목록 요청 처리
export async function GET(req: NextRequest) {
  //  쿼리 파라미터 추출 (page, limit -> 숫자로 파싱)
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  const client = await clientPromise;
  const db = client.db();

  // 기존 일반 주문 조회 · 매핑
  const rawOrders = await db.collection('orders').find().toArray();
  const orders = await Promise.all(
    rawOrders.map(async (order) => {
      // customer 매핑 로직
      const usersColl = db.collection('users');
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
        __type: 'order' as const, // 분기용 타입 필드
        customer,
        userId: order.userId ? order.userId.toString() : null,
        date: order.createdAt,
        status: order.status || '대기중',
        paymentStatus: order.paymentStatus || '결제대기',
        type: '상품', // 기존 ‘상품’ 뱃지
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
          // string 서비스 여부도 기존 주문에서 가져옴
          withStringService: order.shippingInfo.withStringService ?? false,
          invoice: {
            courier: order.shippingInfo.invoice?.courier ?? null,
            trackingNumber: order.shippingInfo.invoice?.trackingNumber ?? null,
          },
        },
      };
    })
  );

  // 스트링 교체 서비스 신청 조회 / 매핑
  const rawApps = await db.collection('stringing_applications').find().toArray();
  const stringingOrders = rawApps.map((app) => {
    // customer 매핑: 회원 스냅샷 vs 비회원 정보
    const customer =
      app.userSnapshot && app.userSnapshot.name
        ? {
            name: app.userSnapshot.name,
            email: app.userSnapshot.email ?? '-',
            phone: '-',
          }
        : {
            name: `${app.guestName ?? '비회원'} (비회원)`,
            email: app.guestEmail || '-',
            phone: app.guestPhone || '-',
          };

    return {
      id: app._id.toString(),

      linkedOrderId: app.orderId?.toString() ?? null,

      __type: 'stringing_application' as const, // 분기용 타입 필드
      customer,
      userId: app.userId ? app.userId.toString() : null,
      date: app.createdAt,
      status: app.status, // 스트링 전용 상태
      paymentStatus: app.paymentStatus || '결제대기',
      type: '서비스', // ‘서비스’ 뱃지
      total: app.totalPrice || 0,
      items: app.items || [],
      shippingInfo: {
        // 주소 연락처 등은 snapshot이거나 guestInfo에서 필요 없으면 '-' 처리
        name: customer.name,
        phone: customer.phone,
        address: app.shippingInfo?.address ?? '-',
        postalCode: app.shippingInfo?.postalCode ?? '-',
        depositor: app.shippingInfo?.depositor ?? '-',
        deliveryRequest: app.shippingInfo?.deliveryRequest,
        shippingMethod: app.shippingInfo?.shippingMethod,
        estimatedDate: app.shippingInfo?.estimatedDate,
        withStringService: true, // 항상 true
        invoice: {
          courier: app.shippingInfo?.invoice?.courier ?? null,
          trackingNumber: app.shippingInfo?.invoice?.trackingNumber ?? null,
        },
      },
    };
  });

  // 두 배열 합치고 날짜 역순 정렬
  const combined = [...orders, ...stringingOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 서버 사이드 페이징: slice 로 잘라낸 뒤, total 과 함께 반환
  const paged = combined.slice(skip, skip + limit);
  const total = combined.length;

  return NextResponse.json({ items: paged, total });
}
