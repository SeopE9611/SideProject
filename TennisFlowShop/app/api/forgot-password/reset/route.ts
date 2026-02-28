import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

import { getDb } from '@/lib/mongodb';
import {
  hashPasswordResetToken,
  verifyPasswordResetToken,
} from '@/lib/password-reset';

// 8자 이상 + 영문 + 숫자 포함
function isPasswordValid(password: string) {
  const lengthOk = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return lengthOk && hasLetter && hasNumber;
}

export async function POST(req: Request) {
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const token = String(body?.token ?? '');
    const newPassword = String(body?.newPassword ?? '');

    if (!token) {
      return NextResponse.json({ message: '재설정 토큰이 필요합니다.' }, { status: 400 });
    }

    if (!isPasswordValid(newPassword)) {
      return NextResponse.json(
        { message: '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.' },
        { status: 400 }
      );
    }

    const payload = verifyPasswordResetToken(token);
    if (!payload) {
      return NextResponse.json(
        { message: '유효하지 않거나 만료된 비밀번호 재설정 링크입니다.' },
        { status: 400 }
      );
    }

    const userId = String(payload.sub ?? '');
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ message: '잘못된 사용자 토큰입니다.' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId),
      isDeleted: { $ne: true },
    });

    if (!user) {
      return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 토큰 payload에 담긴 이메일과 실제 사용자 이메일이 다르면 거부
    // JWT 자체는 유효하더라도 다른 계정에 잘못 적용되는 걸 한 번 더 방지합니다.
    if (String(user.email ?? '').toLowerCase() !== String(payload.email ?? '').toLowerCase()) {
      return NextResponse.json({ message: '토큰 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const hashedToken = hashPasswordResetToken(token);

    // DB에 저장된 최신 토큰과 비교
    // 이렇게 해야 "예전에 보낸 오래된 메일 링크"를 막을 수 있습니다.
    if (!user.passwordResetToken || user.passwordResetToken !== hashedToken) {
      return NextResponse.json(
        { message: '이미 사용되었거나 더 이상 유효하지 않은 링크입니다.' },
        { status: 400 }
      );
    }

    if (!user.passwordResetExpires || new Date(user.passwordResetExpires).getTime() < Date.now()) {
      return NextResponse.json(
        { message: '비밀번호 재설정 링크가 만료되었습니다.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          hashedPassword,
          passwordMustChange: false,
          updatedAt: new Date(),
          passwordResetAt: new Date(),
        },
        $unset: {
          passwordResetToken: '',
          passwordResetExpires: '',
          passwordResetRequestedAt: '',
        },
      }
    );

    // 선택:
    // 감사 로그를 남기고 싶다면 여기서 audits 컬렉션에 insertOne 가능합니다.

    return NextResponse.json(
      { ok: true, message: '비밀번호가 재설정되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[forgot-password/reset] error', error);
    return NextResponse.json(
      { message: '비밀번호 재설정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
