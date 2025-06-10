import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

export async function PATCH(req: NextRequest) {
  // 요청 본문에서 탈퇴 사유(reason)와 세부 사유(detail)를 추출
  const { reason, detail } = await req.json();

  // Authorization 헤더에서 Bearer 토큰 추출
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // JWT 검증
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch {
    return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
  }

  // sub 클레임(사용자 _id) 확인
  const userId = decoded.sub;
  if (!userId) {
    return NextResponse.json({ message: 'Invalid token payload' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // DB에서 userId 기반으로 사용자 조회
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // 탈퇴 제한 조건: 진행 중 주문이 있는 경우 탈퇴 차단
    const hasOngoingOrder = await db.collection('orders').findOne({
      userId: user._id.toString(),
      status: { $in: ['결제대기', '결제완료', '배송중', '대기중'] },
    });

    if (hasOngoingOrder) {
      return NextResponse.json({ error: '진행 중인 주문이 있어 탈퇴할 수 없습니다.\n마이페이지 (주문 내역)에서 확인하세요' }, { status: 400 });
    }

    //  탈퇴 정보를 DB에 업데이트
    // 업데이트 전 원본 이메일 저장 (추후 응답에 사용하기 위함)
    const userEmail = user.email;

    await db.collection('users').updateOne(
      // 이제 user._id 기준으로 업데이트
      { _id: new ObjectId(userId) },
      {
        $set: {
          isDeleted: true, // soft delete 처리
          deletedAt: new Date(), // 탈퇴 시간 기록
          withdrawalReason: reason || null, // 선택한 사유
          withdrawalDetail: detail || null, // 기타 입력 내용
          name: '(탈퇴한 회원)', // 이름 익명화
          email: '', // 이메일 제거
          phone: '', // 연락처 제거
          address: '', // 주소 제거
          postalCode: '', // 우편번호 제거
        },
      }
    );

    // 원본 이메일(userEmail)을 응답에 포함
    return NextResponse.json({ message: '탈퇴 완료', email: userEmail }, { status: 200 });
  } catch (error) {
    console.error('탈퇴 처리 중 오류:', error);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
