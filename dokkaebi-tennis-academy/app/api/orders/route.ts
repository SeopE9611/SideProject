import { NextResponse } from 'next/server'; // Next.js API 응답 처리를 위한 모듈
import clientPromise from '@/lib/mongodb'; // MongoDB 연결을 위한 클라이언트 프라미스
import { ObjectId } from 'mongodb'; // ObjectId 변환을 위해 추가
import jwt, { JwtPayload } from 'jsonwebtoken';
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
    // Authorization 헤더에서 Bearer 토큰 꺼내기
    const authHeader = req.headers.get('authorization') ?? '';
    let userId: string | null = null;

    // Authorization 헤더가 존재하고 Bearer 토큰 형식일 경우 → JWT 검증
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7); // "Bearer " 이후 문자열 추출

      try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
        userId = decoded.sub || null; // JWT의 subject(sub)는 userId
      } catch {
        // 토큰 형식은 맞지만 검증 실패 → 유효하지 않은 토큰
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
      }
    }

    //  클라이언트에서 보낸 요청 body(JSON 형식) 파싱
    const body = await req.json();

    // 요청에서 필요한 필드 구조분해
    const { items, shippingInfo, totalPrice, shippingFee, guestInfo } = body;

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
export async function GET() {
  //  MongoDB 클라이언트 생성 (연결 기다림)
  const client = await clientPromise;

  //  기본 DB 선택 (tennis_academy 같은)
  const db = client.db();

  //  orders 컬렉션에서 모든 주문 조회
  const rawOrders = await db.collection('orders').find().toArray();

  //  users 컬렉션에서 회원 정보 조회 가능하도록 설정
  const usersCollection = db.collection('users');

  // 프론트엔드가 기대하는 형태로 가공 (타입 맞춤)
  // 로그인 회원  |	홍길동
  // 탈퇴 회원    | 홍길동 (탈퇴한 회원)
  // 비회원	홍길동| (비회원)
  // DB 정보도 snapshot도 guest도 없으면	(고객 정보 없음)  <- 진짜 예외일 때만
  const orders = await Promise.all(
    rawOrders.map(async (order) => {
      // users 컬렉션 참조
      const usersColl = db.collection('users');
      let customer: { name: string; email: string; phone: string };

      // 1) 회원 주문 (userSnapshot 이 반드시 존재)
      if (order.userSnapshot) {
        // 실제 users 컬렉션에서 이 계정이 soft-delete 되었는지 확인
        const userDoc = order.userId ? await usersColl.findOne({ _id: new ObjectId(order.userId) }) : null;
        const isDeleted = !!userDoc?.isDeleted;

        customer = {
          // 탈퇴한 회원이면 “이름 (탈퇴한 회원)”, 아니면 스냅샷 이름
          name: isDeleted ? `${order.userSnapshot.name} (탈퇴한 회원)` : order.userSnapshot.name,
          email: order.userSnapshot.email,
          phone: '-', // snapshot에 phone 정보가 없으므로 고정값
        };

        // 2) 비회원 주문 (guestInfo 가 존재)
      } else if (order.guestInfo) {
        customer = {
          name: `${order.guestInfo.name} (비회원)`,
          email: order.guestInfo.email || '-',
          phone: order.guestInfo.phone || '-',
        };

        // 3) DB·스냅샷·guestInfo 모두 없는 예외 케이스
      } else {
        customer = {
          name: '(고객 정보 없음)',
          email: '-',
          phone: '-',
        };
      }

      return {
        id: order._id.toString(), // MongoDB의 ObjectId를 문자열로 변환
        customer,
        userId: order.userId ?? null,
        date: order.createdAt, // createdAt 필드 → 주문 날짜
        status: order.status || '대기중', // 기본값 대기중
        paymentStatus: order.paymentStatus || '결제대기', // 결제 상태
        type: '상품', // 현재는 고정 (필요 시 추후 구분)
        total: order.totalPrice, // 총 가격
        items: order.items || [], // 주문 품목
        shippingInfo: {
          shippingMethod: order.shippingInfo?.shippingMethod,
          estimatedDate: order.shippingInfo?.estimatedDate,
        },
        invoice: {
          trackingNumber: order.invoice?.trackingNumber,
        },
      };
    })
  );

  //  응답을 JSON 형태로 리턴
  return NextResponse.json(orders);
}
