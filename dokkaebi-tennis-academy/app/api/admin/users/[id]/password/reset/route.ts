import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

// 관리자 권한 확인
async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  return payload && payload.role === 'admin' ? payload : null;
}

// 임시 비밀번호 생성 (영문대/소 + 숫자 조합, 반드시 각 그룹 1자 이상 포함)
function generateTempPassword(length = 12) {
  const lowers = 'abcdefghjkmnpqrstuvwxyz';
  const uppers = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lowers + uppers + digits;

  const pick = (src: string) => src[crypto.randomInt(0, src.length)];
  let pwd = pick(lowers) + pick(uppers) + pick(digits); // 최소 1자씩 보장
  for (let i = pwd.length; i < length; i++) pwd += pick(all);
  // 랜덤 셔플
  return pwd
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const db = await getDb();
    const _id = new ObjectId(id);

    const user = await db.collection('users').findOne({ _id }, { projection: { _id: 1, email: 1 } });
    if (!user) return NextResponse.json({ message: 'not found' }, { status: 404 });

    // 1) 임시 비밀번호 생성 & 해시
    const tempPassword = generateTempPassword(12);
    const hashed = await bcrypt.hash(tempPassword, 10);

    // 2) DB 업데이트: 해시 교체 + 플래그/타임스탬프
    await db.collection('users').updateOne(
      { _id },
      {
        $set: {
          hashedPassword: hashed,
          passwordMustChange: true, // (선택) 다음 로그인 때 변경 유도용
          passwordResetAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: { passwordResetToken: '', passwordResetExpires: '' }, // 혹시 남아있다면 제거
      }
    );

    // 3) 감사 로그 기록
    await db
      .collection('user_audit_logs')
      .createIndex({ userId: 1, at: -1 }, { name: 'audit_userId_at' })
      .catch(() => {});
    await db.collection('user_audit_logs').insertOne({
      userId: _id,
      action: '비밀번호 초기화',
      detail: '{}',
      at: new Date(),
      by: new ObjectId(String(admin.sub)),
    });

    // 4) 임시 비밀번호를 한 번만 반환(화면에 노출 후 관리자가 전달)
    return NextResponse.json({ tempPassword, passwordMustChange: true });
  } catch (e) {
    console.error('[admin/users/:id/password/reset] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
