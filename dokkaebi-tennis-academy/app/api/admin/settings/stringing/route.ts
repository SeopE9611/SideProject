/**
 * 스트링 슬롯 설정 관리자 API
 * - GET  : 현재 설정 조회
 * - PATCH: 설정 저장(업데이트/업서트)
 *
 * 추가되는 기능:
 *  1) businessDays (기본 영업 요일, 0=일 ~ 6=토)
 *  2) holidays     (휴무일 날짜 배열, 'YYYY-MM-DD')
 *  3) exceptions[] (특정 날짜의 예외 정책)
 *     - closed: true       => 그 날짜는 휴무
 *     - closed: false/생략 => 그 날짜는 "영업", start/end/interval/capacity로 기본값을 개별 오버라이드
 *
 * 주의:
 *  - 반드시 관리자만 접근 가능 (requireAdmin() 사용)
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

type ExceptionItem = {
  date: string; // 'YYYY-MM-DD'
  closed?: boolean; // true면 해당 날짜는 휴무
  start?: string; // 예외일 시작 시각 'HH:mm'
  end?: string; // 예외일 종료 시각 'HH:mm'
  interval?: number; // 예외일 슬롯 간격(분)
  capacity?: number; // 예외일 동시 수용량
};

type StringingSettings = {
  _id: 'stringingSlots';
  capacity?: number; // 1~10
  businessDays?: number[]; // 0(일)~6(토)
  start?: string; // 'HH:mm'
  end?: string; // 'HH:mm'
  interval?: number; // 5~240 분
  holidays?: string[]; // ['YYYY-MM-DD']
  exceptions?: ExceptionItem[]; // 예외일 정책
  updatedAt?: Date;
};

const COLLECTION = 'settings';
const DOC_ID: StringingSettings['_id'] = 'stringingSlots';

/** 관리자 인증/권한 확인 (기존 프로젝트 유틸 그대로 사용) */
async function requireAdmin() {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  // role이 'admin'인 경우만 허용
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

/** 유효성 도우미 */
const clampNum = (n: any, min: number, max: number) => Math.max(min, Math.min(max, Number(n)));
const isHHMM = (s: any) => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
const isDate = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function GET() {
  // ✅ 관리자 권한 체크 (기존과 동일)
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const doc = await db.collection<StringingSettings>(COLLECTION).findOne({ _id: DOC_ID }, { projection: { updatedAt: 0 } }); // 필요 시 projection 조절

  // 캐시 금지
  return NextResponse.json(doc ?? null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  // ✅ 관리자 권한 체크 (기존과 동일)
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // 본문 파싱
  const body = (await req.json().catch(() => ({}))) as Partial<StringingSettings>;

  // --- 필드별 정규화/검증 ---
  const update: Partial<StringingSettings> = {};

  // 동시 수용량: 1~10
  if (typeof body.capacity === 'number' && Number.isFinite(body.capacity)) {
    update.capacity = clampNum(body.capacity, 1, 10);
  }

  // 시작/종료: 'HH:mm'
  if (isHHMM(body.start)) update.start = body.start!;
  if (isHHMM(body.end)) update.end = body.end!;

  // 간격: 5~240 분
  if (typeof body.interval === 'number' && Number.isFinite(body.interval)) {
    update.interval = clampNum(body.interval, 5, 240);
  }

  // 영업 요일: 0~6 정수 배열
  if (Array.isArray(body.businessDays)) {
    update.businessDays = [...new Set(body.businessDays.map((n: any) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
  }

  // 휴무일: 'YYYY-MM-DD' 배열
  if (Array.isArray(body.holidays)) {
    update.holidays = body.holidays.filter(isDate);
  }

  // 예외일: 배열(날짜 필수), 각 항목에 대해 개별 검증/정규화
  if (Array.isArray(body.exceptions)) {
    update.exceptions = body.exceptions
      .map((e: any) => ({
        date: isDate(e?.date) ? e.date : null,
        closed: e?.closed === true, // true면 휴무일
        start: isHHMM(e?.start) ? e.start : undefined,
        end: isHHMM(e?.end) ? e.end : undefined,
        interval: typeof e?.interval === 'number' ? clampNum(e.interval, 5, 240) : undefined,
        capacity: typeof e?.capacity === 'number' ? clampNum(e.capacity, 1, 10) : undefined,
      }))
      .filter((e) => !!e.date) as ExceptionItem[];
  }

  // 공통 업데이트 타임스탬프
  update.updatedAt = new Date();

  const db = await getDb();
  // upsert: 문서가 없으면 생성, 있으면 업데이트
  await db.collection<StringingSettings>(COLLECTION).updateOne({ _id: DOC_ID }, { $setOnInsert: { _id: DOC_ID }, $set: update }, { upsert: true });

  const doc = await db.collection<StringingSettings>(COLLECTION).findOne({ _id: DOC_ID });
  return NextResponse.json(doc, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

/** 캐시 방지 (Next.js App Router) */
export const dynamic = 'force-dynamic';
