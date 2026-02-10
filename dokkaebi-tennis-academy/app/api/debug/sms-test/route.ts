import { NextResponse } from 'next/server';
import { SolapiMessageService } from 'solapi';

const normalize = (n?: string) => (n || '').replace(/[^\d]/g, '');

export async function GET(req: Request) {
  /**
   * 운영(Production)에서는 비활성화
   * - Vercel: VERCEL_ENV=production 이면 무조건 차단
   * - 그 외 환경: NODE_ENV=production 이면 차단
   */
  const isProd = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production';

  if (isProd) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // 개발/프리뷰 환경에서도 “시크릿 헤더” 없으면 실행 불가
  const expectedSecret = process.env.DEBUG_ENDPOINT_SECRET;
  const providedSecret = req.headers.get('x-debug-secret');

  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: 'DEBUG_ENDPOINT_SECRET is not set' }, { status: 500 });
  }

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const textRaw = url.searchParams.get('text') || '[도깨비] SMS 테스트';
  // 과도한 길이 방지(예상치 못한 비용/오류 방지)
  const text = textRaw.slice(0, 500);

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const fromEnv = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !fromEnv) {
    return NextResponse.json({ ok: false, error: 'SOLAPI env is not set' }, { status: 500 });
  }

  //  수신 허용 목록(최소 1개)은 반드시 있어야 함
  // - 정식: SAFE_SMS_ALLOWLIST
  // - fallback: SAFE_SMS_TO_ALLOWLIST
  const allowEnv = process.env.SAFE_SMS_ALLOWLIST ?? process.env.SAFE_SMS_TO_ALLOWLIST ?? '';
  const allowlist = allowEnv
    .split(',')
    .map((s) => normalize(s.trim()))
    .filter(Boolean);

  if (allowlist.length === 0) {
    return NextResponse.json({ ok: false, error: 'SMS allowlist is empty (set SAFE_SMS_ALLOWLIST)' }, { status: 400 });
  }

  const from = normalize(fromEnv);
  const to = allowlist[0];

  try {
    const svc = new SolapiMessageService(apiKey, apiSecret);
    await svc.sendOne({ to, from, text, type: text.length > 90 ? 'LMS' : 'SMS' });
    return NextResponse.json({ ok: true, sentTo: to, text });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
