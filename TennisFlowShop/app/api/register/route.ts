// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb'; // 단일 DB 유틸 사용
import { hash } from 'bcryptjs';
import { isSignupBonusActive, SIGNUP_BONUS_POINTS, signupBonusRefKey } from '@/lib/points.policy';
import { grantPoints } from '@/lib/points.service';
import { z } from 'zod';

/**
 * POST /api/register
 * - 필수값 검증
 * - 비밀번호 정책 검증(8자 이상, 영문+숫자 포함)
 * - 중복 이메일 검사 (11000 duplicate key도 처리)
 * - 해시 후 사용자 생성
 */

/**
 * 서버(라우터) 최종 유효성 검사
 * - 목적:
 *   1) JSON 파싱 실패/타입 깨짐 요청을 400으로 정리
 *   2) 선택 필드(phone/address/...)에 객체/배열 같은 값이 들어와 DB 오염되는 것 방지
 */
const OptionalStringNullable = z.preprocess((v) => {
  // undefined/null은 null로 통일
  if (v === undefined || v === null) return null;

  // 문자열은 trim 후 빈 문자열이면 null 처리
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length === 0 ? null : s;
  }

  // 숫자는 문자열로 변환(예: 우편번호를 숫자로 보내는 케이스 방어)
  if (typeof v === 'number') return String(v);

  // 그 외(객체/배열 등)는 스키마에서 실패시키기 위해 그대로 반환
  return v;
}, z.string().nullable());

const RegisterBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1)
    .email()
    // 이메일은 대소문자 무시 처리(중복/로그인 일관성)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(50),

  // 선택 필드(빈 문자열 -> null)
  phone: OptionalStringNullable.optional(),
  address: OptionalStringNullable.optional(),
  addressDetail: OptionalStringNullable.optional(),
  postalCode: OptionalStringNullable.optional(),
});

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ message: '요청 본문(JSON)이 올바르지 않습니다.' }, { status: 400 });
  }

  const parsed = RegisterBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    // 기존 동작과 최대한 동일하게(400 + 같은 메시지) 유지
    return NextResponse.json({ message: '필수 항목 누락' }, { status: 400 });
  }

  // 입력 정리(이메일 소문자/trim, name trim, 선택필드 빈값->null)은 스키마에서 처리됨
  const { email, password, name } = parsed.data;
  const phone = parsed.data.phone ?? null;
  const address = parsed.data.address ?? null;
  const addressDetail = parsed.data.addressDetail ?? null;
  const postalCode = parsed.data.postalCode ?? null;

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
    const insertRes = await users.insertOne({
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

    // 6) 회원가입 보너스 지급(이벤트 ON + 기간 내)
    // - 실패해도 회원가입 자체는 성공해야 하므로 try/catch로 격리
    try {
      if (isSignupBonusActive()) {
        await grantPoints(db, {
          userId: insertRes.insertedId,
          amount: SIGNUP_BONUS_POINTS,
          type: 'signup_bonus',
          refKey: signupBonusRefKey(insertRes.insertedId),
          reason: `회원가입 보너스 ${SIGNUP_BONUS_POINTS}P`,
        });
      }
    } catch (e) {
      console.warn('[register] signup bonus grant failed', e);
    }

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
