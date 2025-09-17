import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

function summarizeUA(ua: string) {
  const s = ua || '';
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(s);
  const os = /Windows/i.test(s) ? 'Windows' : /Mac OS X/i.test(s) ? 'macOS' : /Android/i.test(s) ? 'Android' : /iPhone|iPad|iOS/i.test(s) ? 'iOS' : /Linux/i.test(s) ? 'Linux' : '기타';
  const browser = /Edg/i.test(s) ? 'Edge' : /Chrome/i.test(s) ? 'Chrome' : /Firefox/i.test(s) ? 'Firefox' : /Safari/i.test(s) ? 'Safari' : '기타';
  return { os, browser, isMobile };
}

async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  return payload?.role === 'admin' ? payload : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(20, Number(url.searchParams.get('limit') || 5)));

    const db = await getDb();
    await db
      .collection('user_sessions')
      .createIndex({ userId: 1, at: -1 })
      .catch((e: any) => {
        if (e?.code !== 85) throw e;
      });

    const rows = await db
      .collection('user_sessions')
      .find({ userId: new ObjectId(id) })
      .sort({ at: -1 })
      .limit(limit)
      .project({ _id: 0, userId: 0 })
      .toArray();

    const items = rows.map((r: any) => ({ ...r, ...summarizeUA(r.ua || '') }));
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/sessions] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
