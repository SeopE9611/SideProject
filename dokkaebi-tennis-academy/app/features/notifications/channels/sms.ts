import { SolapiMessageService } from 'solapi';

const norm = (n?: string) => (n || '').replace(/[^\d]/g, '');
const maskPhone = (n: string) => {
  if (!n) return '';
  if (n.length <= 4) return '*'.repeat(n.length);
  // 010****5678 형태
  const head = n.slice(0, 3);
  const tail = n.slice(-4);
  return `${head}****${tail}`;
};

export async function sendSMS(toRaw: string, text: string) {
  // 안전장치 (플래그 & 허용목록)
  const enabled = process.env.NOTIFY_SMS_ENABLED === 'true';
  const allow = (process.env.SAFE_SMS_ALLOWLIST ?? '')
    .split(',')
    .map((s) => norm(s.trim()))
    .filter(Boolean);

  const to = norm(toRaw);
  if (!enabled) return; // 전체 OFF
  if (allow.length && !allow.includes(to)) return; // 허용목록 아니면 차단

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = norm(process.env.SOLAPI_SENDER);

  if (!apiKey || !apiSecret || !from) {
    throw new Error('SOLAPI env missing');
  }
  // 운영에서 PII 출력 방지: 개발 환경에서만, 마스킹해서 로그
  if (process.env.NODE_ENV === 'development') {
    console.log('[sms] send', { to: maskPhone(to), from: maskPhone(from), textLen: text.length, allowCount: allow.length });
  }

  const svc = new SolapiMessageService(apiKey, apiSecret);
  await svc.sendOne({
    to,
    from,
    text,
    type: text.length > 90 ? 'LMS' : 'SMS',
  });
}
