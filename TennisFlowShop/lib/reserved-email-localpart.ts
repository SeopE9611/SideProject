export const RESERVED_EMAIL_LOCALPART_MESSAGE =
  '사용할 수 없는 이메일 아이디입니다. 운영/공식 계정으로 오해될 수 있는 표현은 사용할 수 없습니다.';

const EMAIL_LOCALPART_EXACT = new Set([
  // A) 운영/권한/공식 사칭
  'admin',
  'administrator',
  'root',
  'superadmin',
  'official',
  'support',
  'helpdesk',
  'staff',
  'moderator',
  'system',
  'bot',
  '관리자',
  '운영자',
  '운영진',
  '공식',
  '고객센터',
  '문의센터',
  '지원팀',
  '보안팀',
  '운영팀',
  '관리자팀',
  '시스템봇',
  '운영봇',
  '관리자봇',
  'noreply',
  'postmaster',
  'abuse',
  'mailerdaemon',

  // B) 브랜드/서비스 사칭
  'tennisflow',
  'tennisflowshop',
  'tennisflowofficial',
  '테니스플로우',
  '테니스플로우샵',
  '공식테니스플로우',

  // C) 혼동 유발 특수값
  'null',
  'undefined',
  'unknown',
  'deleted',
  'systemuser',
]);

const EMAIL_LOCALPART_PREFIX = [
  'admin',
  'administrator',
  'superadmin',
  'official',
  'root',
  'system',
  'bot',
  '관리자',
  '운영자',
  '운영진',
  '공식',
  '고객센터',
  '문의센터',
  '지원팀',
  '보안팀',
  '운영팀',
  '관리자팀',
  '시스템봇',
  '운영봇',
  '관리자봇',
  'tennisflow',
  'tennisflowshop',
  'tennisflowofficial',
  '테니스플로우',
  '테니스플로우샵',
  '공식테니스플로우',
];

export function extractEmailLocalPart(email: string): string {
  const rawLocalPart = String(email ?? '').split('@')[0] ?? '';
  return rawLocalPart.split('+')[0] ?? '';
}

export function normalizeEmailLocalPartInput(value: string): string {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase();
}

export function normalizeEmailLocalPartForComparison(value: string): string {
  return normalizeEmailLocalPartInput(value).replace(/[\s_.-]/g, '');
}

export function isReservedEmailLocalPart(email: string): boolean {
  const localPart = extractEmailLocalPart(email);
  const normalized = normalizeEmailLocalPartInput(localPart);
  const compact = normalizeEmailLocalPartForComparison(localPart);

  if (!normalized) return false;

  if (EMAIL_LOCALPART_EXACT.has(normalized) || EMAIL_LOCALPART_EXACT.has(compact)) {
    return true;
  }

  return EMAIL_LOCALPART_PREFIX.some((keyword) => {
    const normalizedKeyword = normalizeEmailLocalPartInput(keyword);
    const compactKeyword = normalizeEmailLocalPartForComparison(keyword);
    return normalized.startsWith(normalizedKeyword) || compact.startsWith(compactKeyword);
  });
}

export function getReservedEmailLocalPartErrorMessage(email: string): string | null {
  if (!isReservedEmailLocalPart(email)) return null;
  return RESERVED_EMAIL_LOCALPART_MESSAGE;
}
