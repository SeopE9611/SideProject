import { NextResponse } from 'next/server';
import { SolapiMessageService } from 'solapi';

const normalize = (n?: string) => (n || '').replace(/[^\d]/g, '');

export async function GET(req: Request) {
  const url = new URL(req.url);
  const toParam = normalize(url.searchParams.get('to') || '');
  const text = url.searchParams.get('text') || '[도깨비] SMS 테스트';

  const apiKey = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const from = normalize(process.env.SOLAPI_SENDER!);
  const to = toParam || from; // to 없으면 본인에게

  try {
    const svc = new SolapiMessageService(apiKey, apiSecret);
    await svc.sendOne({ to, from, text, type: text.length > 90 ? 'LMS' : 'SMS' });
    return NextResponse.json({ ok: true, sentTo: to, text });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
