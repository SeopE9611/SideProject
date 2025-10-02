import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

type StringingSettings = {
  _id: 'stringingSlots';
  capacity?: number;
  businessDays?: number[];
  start?: string;
  end?: string;
  interval?: number;
  holidays?: string[];
  updatedAt?: Date;
};

// 관리자 권한 확인(프로젝트의 인증 유틸에 맞춤)
async function requireAdmin() {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// GET: 현재 설정 조회
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const settingsCol = db.collection<StringingSettings>('settings');
  const doc = await settingsCol.findOne({ _id: 'stringingSlots' });
  return NextResponse.json(doc ?? null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

// PATCH: 설정 변경 (capacity 등)
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const allow: any = {};

  if (typeof body.capacity === 'number' && Number.isFinite(body.capacity)) {
    const c = Math.floor(body.capacity);
    if (c >= 1 && c <= 10) allow.capacity = c;
  }
  if (typeof body.start === 'string') allow.start = body.start;
  if (typeof body.end === 'string') allow.end = body.end;
  if (typeof body.interval === 'number' && Number.isFinite(body.interval)) {
    const iv = Math.floor(body.interval);
    if (iv >= 10 && iv <= 120) allow.interval = iv;
  }
  if (Array.isArray(body.businessDays)) {
    allow.businessDays = body.businessDays.filter((n: any) => Number.isInteger(n) && n >= 0 && n <= 6);
  }
  if (Array.isArray(body.holidays)) {
    allow.holidays = body.holidays.filter((s: any) => typeof s === 'string');
  }

  const db = await getDb();
  const settingsCol = db.collection<StringingSettings>('settings');

  await settingsCol.updateOne({ _id: 'stringingSlots' }, { $set: { ...allow, updatedAt: new Date() } }, { upsert: true });

  const doc = await settingsCol.findOne({ _id: 'stringingSlots' });
  return NextResponse.json(doc, { status: 200 });
}

export const dynamic = 'force-dynamic';
