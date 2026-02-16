/**
 * 스트링 슬롯 설정 관리자 API
 * - GET  : 현재 설정 조회
 * - PATCH: 설정 저장(업데이트/업서트)
 *
 *  1) businessDays (기본 영업 요일, 0=일 ~ 6=토)
 *  2) holidays     (휴무일 날짜 배열, 'YYYY-MM-DD')
 *  3) exceptions[] (특정 날짜의 예외 정책)
 *     - closed: true       => 그 날짜는 휴무
 *     - closed: false/생략 => 그 날짜는 "영업", start/end/interval/capacity로 기본값을 개별 오버라이드
 *
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { sanitizeExceptionInput, validateBaseSettings, validateExceptionItem } from '@/lib/stringingSettingsValidation';

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
  bookingWindowDays?: number; // 예약 가능 기간 (일)
  updatedAt?: Date;
};

const COLLECTION = 'settings';
const DOC_ID: StringingSettings['_id'] = 'stringingSlots';

/** 관리자 인증/권한 확인 (기존 프로젝트 유틸 그대로 사용) */
/** 유효성 도우미 */
const isHHMM = (s: any) => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
const isDate = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function GET(req: Request) {
  // 관리자 권한 체크
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const doc = await db.collection<StringingSettings>(COLLECTION).findOne({ _id: DOC_ID }, { projection: { updatedAt: 0 } }); // 필요 시 projection 조절

  // 캐시 금지
  return NextResponse.json(doc ?? null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  // 관리자 권한 체크
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // 본문 파싱
  const body = (await req.json().catch(() => ({}))) as Partial<StringingSettings>;
  const db = await getDb();
  const current = await db.collection<StringingSettings>(COLLECTION).findOne({ _id: DOC_ID });

  // --- 필드별 정규화/검증 ---
  const update: Partial<StringingSettings> = {};

  // 동시 수용량: 1~10
  if (body.capacity !== undefined) {
    if (typeof body.capacity !== 'number' || !Number.isFinite(body.capacity)) {
      return NextResponse.json({ message: '동시 수용량은 숫자여야 합니다.' }, { status: 400 });
    }
    update.capacity = Math.trunc(body.capacity);
  }

  // 시작/종료: 'HH:mm'
  if (isHHMM(body.start)) update.start = body.start!;
  if (isHHMM(body.end)) update.end = body.end!;

  // 간격: 5~240 분
  if (body.interval !== undefined) {
    if (typeof body.interval !== 'number' || !Number.isFinite(body.interval)) {
      return NextResponse.json({ message: '간격은 숫자여야 합니다.' }, { status: 400 });
    }
    update.interval = Math.trunc(body.interval);
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
        interval: typeof e?.interval === 'number' && Number.isFinite(e.interval) ? Math.trunc(e.interval) : undefined,
        capacity: typeof e?.capacity === 'number' && Number.isFinite(e.capacity) ? Math.trunc(e.capacity) : undefined,
      }))
      .filter((e) => !!e.date)
      .map((e) => sanitizeExceptionInput(e as ExceptionItem)) as ExceptionItem[];
  }

  // 예약 가능 기간(일): 1~180 허용
  if (body.bookingWindowDays !== undefined) {
    const n = Number(body.bookingWindowDays);
    if (!Number.isFinite(n)) {
      return NextResponse.json({ message: '예약 가능 기간은 숫자여야 합니다.' }, { status: 400 });
    }
    if (n < 1 || n > 180) {
      return NextResponse.json({ message: '예약 가능 기간은 1~180일 범위로 설정해주세요.' }, { status: 400 });
    }
    update.bookingWindowDays = Math.trunc(n);
  }

  const mergedBase = {
    capacity: update.capacity ?? Number(current?.capacity ?? 1),
    start: update.start ?? String(current?.start ?? '10:00'),
    end: update.end ?? String(current?.end ?? '19:00'),
    interval: update.interval ?? Number(current?.interval ?? 30),
    bookingWindowDays: update.bookingWindowDays ?? Number(current?.bookingWindowDays ?? 30),
  };

  const baseError = validateBaseSettings(mergedBase);
  if (baseError) {
    return NextResponse.json({ message: baseError }, { status: 400 });
  }

  if (Array.isArray(update.exceptions)) {
    for (const ex of update.exceptions) {
      const validationError = validateExceptionItem(ex);
      if (validationError) {
        return NextResponse.json({ message: validationError }, { status: 400 });
      }
    }
  }

  // 공통 업데이트 타임스탬프
  update.updatedAt = new Date();

  // upsert: 문서가 없으면 생성, 있으면 업데이트
  await db.collection<StringingSettings>(COLLECTION).updateOne({ _id: DOC_ID }, { $setOnInsert: { _id: DOC_ID }, $set: update }, { upsert: true });

  const doc = await db.collection<StringingSettings>(COLLECTION).findOne({ _id: DOC_ID });
  return NextResponse.json(doc, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

/** 캐시 방지 (Next.js App Router) */
export const dynamic = 'force-dynamic';
