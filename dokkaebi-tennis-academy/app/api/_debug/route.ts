import { NextResponse } from 'next/server';
import { sendEmail } from '@/app/features/notifications/channels/email'; // 프로젝트의 실제 경로에 맞추세요

export async function GET() {
  try {
    // 허용목록 첫 주소(없으면 본인)로 보냄 — SAFE_MODE일 때도 통과되도록
    const to = process.env.SAFE_RCPT_ALLOWLIST?.split(',')[0]?.trim() || 'pplo23@naver.com';

    console.log('[sendgrid-test]', {
      from: process.env.MAIL_FROM,
      to,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      secure: process.env.SMTP_SECURE,
    });

    await sendEmail({
      to,
      subject: '[테스트] 도깨비 아카데미 SendGrid 파이프라인 확인',
      html: `<p>이 메일이 도착했다면 프로덕션 SMTP 연결 OK<br/>MAIL_FROM=${process.env.MAIL_FROM}</p>`,
    });

    return NextResponse.json({ ok: true, sentTo: to });
  } catch (e: any) {
    console.error('[sendgrid-test] error:', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
