import { NextResponse } from 'next/server'; // Next.js API 응답 처리를 위한 모듈
import clientPromise from '@/lib/mongodb'; // MongoDB 연결을 위한 클라이언트 프라미스
import { getServerSession } from 'next-auth'; // 현재 로그인된 세션 정보를 불러오는 함수
import { authConfig } from '@/lib/auth.config'; // 우리가 설정한 인증 옵션 가져오기 (id 포함 확장됨)

// 주문 객체의 타입 정의
type Order = {
  items: any; // 장바구니에 담긴 상품 목록
  shippingInfo: any; // 배송지 정보 (주소, 우편번호 등)
  totalPrice: number; // 총 결제 금액
  shippingFee: number; // 배송비
  createdAt: Date; // 주문 시각
  userId?: string; // 회원일 경우 사용자 ID (세션에서 가져옴)
  guestInfo?: {
    // 비회원일 경우 입력한 정보
    name: string;
    phone: string;
    email: string;
  };
};

// POST 메서드 처리 함수 – 주문 생성
export async function POST(req: Request) {
  try {
    // 현재 로그인한 사용자 세션 가져오기 (로그인 안 되어 있으면 null)
    const session = await getServerSession(authConfig);

    // 클라이언트에서 보낸 요청 body(JSON 형식) 파싱
    const body = await req.json();

    // 요청에서 필요한 필드 구조분해
    const { items, shippingInfo, totalPrice, shippingFee, guestInfo } = body;

    // 주문 객체 생성 – 기본 필드들만 먼저 채워넣음
    const order: Order = {
      items,
      shippingInfo,
      totalPrice,
      shippingFee,
      createdAt: new Date(), // 현재 시간 기준으로 생성
    };

    // 로그인된 사용자면 userId 추가
    if (session?.user && 'id' in session.user) {
      order.userId = session.user.id;
    }
    // 비회원이면 guestInfo 추가
    else {
      order.guestInfo = guestInfo;
    }

    // MongoDB 클라이언트 연결 및 DB 선택
    const client = await clientPromise;
    const db = client.db(); // 기본 DB (보통 .env에서 지정된 DB 사용됨)

    // 주문 컬렉션에 주문 문서 삽입
    const result = await db.collection('orders').insertOne(order);

    // 성공적으로 삽입되었으면 클라이언트에 성공 응답 + orderId 반환
    return NextResponse.json({ success: true, orderId: result.insertedId });
  } catch (error) {
    // 에러 발생 시 서버 콘솔에 출력하고 클라이언트에 실패 응답 반환
    console.error('주문 POST 에러:', error);

    return NextResponse.json({ success: false, error: '주문 생성 중 오류 발생' }, { status: 500 });
  }
}
