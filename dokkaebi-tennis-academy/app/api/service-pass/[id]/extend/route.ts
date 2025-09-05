import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';

/**
 * body 예시:
 * {
 *   "mode": "days" | "absolute",
 *   "days": 30,                     // mode=days일 때
 *   "newExpiry": "2026-12-31",      // mode=absolute일 때
 *   "reason": "고객 요청으로 1개월 연장"
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }

    // 인증
    const jar = await cookies();
    const at = jar.get('accessToken')?.value || null;
    const rt = jar.get('refreshToken')?.value || null;

    let user: any = at ? verifyAccessToken(at) : null;
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {}
    }
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = user?.role === 'admin' || user?.roles?.includes?.('admin') || user?.isAdmin === true || ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 입력 파싱/검증
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode as 'days' | 'absolute';
    const reason = String(body?.reason ?? '');

    if (mode !== 'days' && mode !== 'absolute') {
      return NextResponse.json({ error: 'mode must be days|absolute' }, { status: 400 });
    }

    // 대상 패스 로드
    const db = (await clientPromise).db();
    const passes = db.collection('service_passes');
    const pass = await passes.findOne({ _id: new ObjectId(id) });
    if (!pass) return NextResponse.json({ error: 'pass not found' }, { status: 404 });

    // 차기 만료일 계산
    const now = new Date();
    const currentExpiry = pass.expiresAt ? new Date(pass.expiresAt) : null;
    let nextExpiry: Date;

    if (mode === 'days') {
      const days = Number(body?.days || 0);
      if (!Number.isFinite(days) || days === 0) {
        return NextResponse.json({ error: 'days must be non-zero number' }, { status: 400 });
      }
      const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
      nextExpiry = new Date(base.getTime() + days * 86400000);
    } else {
      const d = new Date(body?.newExpiry);
      if (!d || Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'invalid newExpiry' }, { status: 400 });
      }
      nextExpiry = d;
    }

    // 업데이트 (패스 만료일)
    await passes.updateOne({ _id: new ObjectId(id) }, { $set: { expiresAt: nextExpiry, updatedAt: new Date() } });

    // 관련 패키지 주문 히스토리에도 로그 남기기 — 감사추적용
    if (pass.orderId) {
      await db.collection('packageOrders').updateOne({ _id: pass.orderId }, { $push: { history: { status: '만료연장', date: new Date(), description: `만료일 ${pass.expiresAt ?? '-'} → ${nextExpiry.toISOString()} (${reason})` } } as any });
    }

    // 최신 스냅샷 반환
    const fresh = await passes.findOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true, item: fresh });
  } catch (e: any) {
    console.error('[POST /api/service-passes/:id/extend] error', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
