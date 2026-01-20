import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 서버 검증
const ALLOWED_COURIERS = ['cj', 'post', 'logen', 'hanjin'] as const;
const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

function badRequest(error: string, fieldErrors?: Record<string, string[]>) {
  return NextResponse.json(
    {
      message: 'INVALID_FIELDS',
      error,
      fieldErrors: fieldErrors ?? null,
    },
    { status: 400 },
  );
}

function parseShippedAt(input?: unknown): { ok: true; value: Date } | { ok: false; error: string } {
  if (!input) return { ok: true, value: new Date() };

  const s = String(input).trim();
  if (!s) return { ok: true, value: new Date() };

  // date input(YYYY-MM-DD) 우선 처리: timezone 흔들림을 줄이기 위해 UTC 정오로 고정
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split('-').map((n) => Number(n));
    const d = new Date(Date.UTC(yy, mm - 1, dd, 12, 0, 0));
    if (Number.isNaN(d.getTime())) return { ok: false, error: '발송일이 올바르지 않습니다.' };
    return { ok: true, value: d };
  }

  // 그 외 ISO/date-time 문자열
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { ok: false, error: '발송일이 올바르지 않습니다.' };
  return { ok: true, value: d };
}

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

  // 파라미터/바디 검증
  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const schema = z.object({
    courier: z.enum(ALLOWED_COURIERS),
    trackingNumber: z.string(),
    shippedAt: z.any().optional(),
    note: z.string().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest('요청 값이 올바르지 않습니다.', parsed.error.flatten().fieldErrors as any);
  }

  const courier = parsed.data.courier;
  const trackingDigits = onlyDigits(parsed.data.trackingNumber);
  if (!trackingDigits) {
    return badRequest('운송장 번호를 입력하세요', { trackingNumber: ['운송장 번호를 입력하세요'] });
  }
  if (trackingDigits.length < 9 || trackingDigits.length > 20) {
    return badRequest('운송장 번호는 숫자 9~20자리만 입력해주세요', { trackingNumber: ['운송장 번호는 숫자 9~20자리만 입력해주세요'] });
  }

  const shippedAtParsed = parseShippedAt(parsed.data.shippedAt);
  if (!shippedAtParsed.ok) {
    return badRequest(shippedAtParsed.error, { shippedAt: [shippedAtParsed.error] });
  }

  // 미래 날짜 방지(타임존/입력 오차 고려 24시간 여유)
  const now = Date.now();
  if (shippedAtParsed.value.getTime() > now + 1000 * 60 * 60 * 24) {
    return badRequest('발송일은 미래 날짜로 설정할 수 없습니다.', { shippedAt: ['발송일은 미래 날짜로 설정할 수 없습니다.'] });
  }

  const note = (parsed.data.note ?? '').trim();
  if (note.length > 200) {
    return badRequest('메모는 200자 이내로 입력해주세요.', { note: ['메모는 200자 이내로 입력해주세요.'] });
  }
  // 소유자 검증
  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const ownerId = new ObjectId(payload.sub);
  const mine = await db.collection('rental_orders').findOne({ _id, userId: ownerId });
  if (!mine) return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 });

  // 저장
  await db.collection('rental_orders').updateOne(
    { _id },
    {
      $set: {
        'shipping.return': {
          courier,
          trackingNumber: trackingDigits,
          shippedAt: shippedAtParsed.value,
          note,
        },
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true });
}
