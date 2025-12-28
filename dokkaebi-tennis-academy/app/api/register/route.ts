// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb'; // 단일 DB 유틸 사용
import { hash } from 'bcryptjs';

/**
 * POST /api/register
 * - 필수값 검증
 * - 비밀번호 정책 검증(8자 이상, 영문+숫자 포함)
 * - 중복 이메일 검사 (11000 duplicate key도 처리)
 * - 해시 후 사용자 생성
 */
export async function POST(req: Request) {
  const raw = await req.json();

  // 입력 정리(앞뒤 공백 제거 및 이메일 소문자 정규화)
  const email = (raw?.email ?? '').toString().trim().toLowerCase();
  const password = (raw?.password ?? '').toString();
  const name = (raw?.name ?? '').toString().trim();

  // 선택 필드
  const phone = raw?.phone ?? null;
  const address = raw?.address ?? null;
  const addressDetail = raw?.addressDetail ?? null;
  const postalCode = raw?.postalCode ?? null;

  // 1) 필수값 검증
  if (!email || !password || !name) {
    return NextResponse.json({ message: '필수 항목 누락' }, { status: 400 });
  }

  // 2) 비밀번호 정책
  const isPasswordValid = (pw: string) => {
    const lengthOk = pw.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    return lengthOk && hasLetter && hasNumber;
  };
  if (!isPasswordValid(password)) {
    return NextResponse.json({ message: '비밀번호는 8자 이상이며, 영문과 숫자를 모두 포함해야 합니다.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');

    // 3) 애플리케이션 레벨 중복 검사(낙관적)
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ message: '이미 존재하는 사용자입니다' }, { status: 409 });
    }

    // 4) 비밀번호 해시
    const hashedPassword = await hash(password, 10);

    // 5) 사용자 생성
    await users.insertOne({
      email,
      name,
      hashedPassword, // 평문 저장 금지
      isDeleted: false,
      phone,
      address,
      addressDetail,
      postalCode,
      pointsBalance: 0, // 포인트(적립금) 잔액 캐시(원장 기반으로 증감). 신규 회원은 0에서 시작.
      pointsDebt: 0, // 미정산 차감분(환불/회수로 잔액을 음수로 만들지 않기 위해 별도 누적)
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: '회원가입 완료' }, { status: 201 });
  } catch (err: any) {
    // 6) DB 레벨 unique 충돌 대응(인덱스가 있는 경우)
    //    E11000 duplicate key error collection: ... index: email_1 dup key: { email: "..." }
    if (err?.code === 11000) {
      return NextResponse.json({ message: '이미 존재하는 사용자입니다' }, { status: 409 });
    }

    console.error('[API register] error:', err);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
