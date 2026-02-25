import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { z } from 'zod';

type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderMode(): GuestOrderMode {
  const raw = (process.env.GUEST_ORDER_MODE ?? 'on').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'on';
}

// 비회원 주문 조회는 "클라 입력"을 절대 신뢰하면 안 됨.
//       (쿼리스트링/바디는 얼마든지 조작 가능)
//       그래서 서버에서 최종 정규화 + 유효성 검증을 강제.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhoneDigits = (digits: string) => digits.length === 10 || digits.length === 11;

// RegExp injection 방지용(이메일을 case-insensitive exact match로 조회할 때 사용)
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const requestSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: '이름은 필수입니다.' })
    .refine((s) => s.length <= 50, { message: '이름은 50자 이내로 입력해주세요.' }),
  email: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: '이메일은 필수입니다.' })
    .refine((s) => EMAIL_RE.test(s), { message: '유효한 이메일 주소를 입력해주세요.' })
    .refine((s) => s.length <= 254, { message: '이메일이 너무 깁니다.' }),
  phone: z
    .string()
    .optional()
    .transform((v) => {
      // 비어있거나 undefined면 필터에서 제외하기 위해 undefined로 정규화
      const d = onlyDigits(v);
      return d ? d : undefined;
    })
    .refine((v) => !v || isValidKoreanPhoneDigits(v), { message: '전화번호는 숫자 10~11자리만 입력해주세요.' }),
});

export async function POST(req: Request) {
  try {
    // 운영 정책: off이면 비회원 주문 "조회"도 중단.
    // 주문 존재 여부/검색 결과 노출을 막기 위해 404로 통일.
    if (getGuestOrderMode() === 'off') {
      return NextResponse.json({ success: false, error: '비회원 주문 조회가 현재 중단되었습니다.' }, { status: 404 });
    }
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      // 폼에서 사용자에게 보여주기 쉬운 형태로 내려줌
      const flat = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: flat.formErrors?.[0] ?? '요청 값이 올바르지 않습니다.',
          fieldErrors: flat.fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, phone } = parsed.data;

    const client = await clientPromise;
    const db = client.db();

    // UI 문구와 일치: 최근 6개월 이내 주문만 조회 가능
    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const baseQuery: any = {
      guestInfo: {
        $exists: true,
        $ne: null,
      },
      'guestInfo.name': name,
      createdAt: { $gte: since },
      // 전화번호는 선택 조건 (있으면 추가로 일치시킴)
      ...(phone ? { 'guestInfo.phone': phone } : {}),
    };

    // 1) 기본: 이메일 exact match (가장 빠르고 인덱스 친화적)
    const exactQuery = { ...baseQuery, 'guestInfo.email': email };
    let orders = await db.collection('orders').find(exactQuery).sort({ createdAt: -1 }).limit(50).toArray();

    // 2) 보정: 대소문자 차이로 exact가 0건이면, case-insensitive exact fallback
    //    (주문 생성 시 이메일을 lowercase로 강제하지 않았을 가능성이 있어 UX 보정용)
    if (orders.length === 0) {
      const emailRe = new RegExp(`^${escapeRegex(email)}$`, 'i');
      const ciQuery = { ...baseQuery, 'guestInfo.email': emailRe };
      orders = await db.collection('orders').find(ciQuery).sort({ createdAt: -1 }).limit(50).toArray();
    }

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('[GUEST_ORDER_LOOKUP_ERROR]', error);
    return NextResponse.json({ success: false, error: '주문 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
