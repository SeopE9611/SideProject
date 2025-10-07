import { NextResponse } from 'next/server';

// Solapi SDK
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SolapiMessageService } = require('solapi');

export async function GET() {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !from) {
    return NextResponse.json({ ok: false, error: 'Missing SOLAPI env vars' }, { status: 500 });
  }

  // 받는 번호: 우선 본인 휴대폰으로 테스트 (숫자만)
  const to = from;

  try {
    const messageService = new SolapiMessageService(apiKey, apiSecret);

    // 90자 초과면 LMS로 자동 전환하도록 간단 메시지
    await messageService.sendOne({
      to,
      from,
      text: '[도깨비 테니스] SMS 테스트입니다. 이 메시지가 도착하면 Solapi 연동 OK!',
    });

    return NextResponse.json({ ok: true, sentTo: to });
  } catch (e: any) {
    console.error('[sms-test] error:', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
