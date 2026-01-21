import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 서버 기준: courier allowlist + trackingNumber digits(9~20) + note(<=200) + shippedAt 유효날짜
const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const isValidTrackingDigits = (digits: string) => digits.length >= 9 && digits.length <= 20;

const requestSchema = z.object({
  courier: z.enum(['cj', 'post', 'logen', 'hanjin'], {
    errorMap: () => ({ message: '택배사를 올바르게 선택해주세요.' }),
  }),
  trackingNumber: z
    .string()
    .transform((s) => onlyDigits(s))
    .refine((d) => isValidTrackingDigits(d), { message: '운송장 번호는 숫자 9~20자리만 입력해주세요.' }),
  shippedAt: z
    .string()
    .optional()
    .transform((v) => {
      const t = String(v ?? '').trim();
      return t ? t : undefined;
    })
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), { message: '발송일 형식이 올바르지 않습니다.' }),
  note: z
    .string()
    .optional()
    .transform((v) => {
      const t = String(v ?? '').trim();
      return t ? t : undefined;
    })
    .refine((v) => !v || v.length <= 200, { message: '메모는 200자 이내로 입력해주세요.' }),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // 로그인 검증
  const at = (await cookies()).get('accessToken')?.value;
  let payload: any = null;
  try {
    payload = at ? verifyAccessToken(at) : null;
  } catch {
    payload = null;
  }
  if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  /**
   * sub(ObjectId 문자열) 최종 방어
   * - verifyAccessToken이 성공해도 sub 형식이 깨져 있으면 new ObjectId(sub)에서 500이 납니다.
   * - 따라서 "문자열 + ObjectId 유효"인 경우에만 통과시킵니다.
   */
  const sub = typeof payload?.sub === 'string' && ObjectId.isValid(payload.sub) ? payload.sub : null;
  if (!sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // 파라미터/바디 검증
  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      {
        ok: false,
        message: 'INVALID_FIELDS',
        error: flat.formErrors?.[0] ?? '요청 값이 올바르지 않습니다.',
        fieldErrors: flat.fieldErrors,
      },
      { status: 400 },
    );
  }

  const { courier, trackingNumber, shippedAt, note } = parsed.data;
  // 소유자 검증
  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const ownerId = new ObjectId(sub);
  const mine = await db.collection('rental_orders').findOne({ _id, userId: ownerId });
  if (!mine) return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 });

  // 저장
  await db.collection('rental_orders').updateOne(
    { _id },
    {
      $set: {
        'shipping.return': {
          courier,
          trackingNumber,
          shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
          note: note ?? '',
        },
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true });
}
