import { NextResponse } from 'next/server';
import { sendEmail } from '@/app/features/notifications/channels/email';

export async function GET(req: Request) {
  /**
   * 운영(Production)에서는 비활성화
   * - Vercel: VERCEL_ENV=production 이면 무조건 차단
   * - 그 외 환경: NODE_ENV=production 이면 차단
   */
  const isProd = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production';

  if (isProd) {
    // 404로 숨겨서 스캐너/봇에 덜 노출되게 처리
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

  try {
    // 수신 허용 목록(최소 1개)은 반드시 있어야 함 (하드코딩 fallback 금지)
    const allowlist =
      process.env.SAFE_RCPT_ALLOWLIST?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    if (allowlist.length === 0) {
      return NextResponse.json({ ok: false, error: 'SAFE_RCPT_ALLOWLIST is empty' }, { status: 400 });
    }

    const to = allowlist[0];

    // 수신자/환경
    console.log('[sendgrid-test] sending test email to:', to);

    await sendEmail({
      to,
      subject: '[테스트] 도깨비 아카데미 SendGrid 파이프라인 확인',
      html: `<p>이 메일이 도착했다면 SMTP 연결 OK<br/>MAIL_FROM=${process.env.MAIL_FROM}</p>`,
    });

    return NextResponse.json({ ok: true, sentTo: to });
  } catch (e: unknown) {
    console.error('[sendgrid-test] error:', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
