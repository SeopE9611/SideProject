export const RESERVED_DISPLAY_NAME_MESSAGE =
  '사용할 수 없는 이름입니다. 운영/공식 계정으로 오해될 수 있는 표현은 사용할 수 없습니다.';

type ReservedCategory = 'impersonation' | 'brand' | 'system_route' | 'confusing';

export const normalizeDisplayNameInput = (value: string) => value.normalize('NFKC').trim().toLowerCase();
export const normalizeDisplayNameForComparison = (value: string) => normalizeDisplayNameInput(value).replace(/[\s_.-]/g, '');

const IMPERSONATION_EXACT = new Set([
  'admin',
  'administrator',
  'root',
  'superadmin',
  'owner',
  'master',
  'staff',
  'moderator',
  'mod',
  'support',
  'official',
  'system',
  'bot',
  'security',
  'helpdesk',
  'cs',
  'operator',
  'ops',
  '관리자',
  '운영자',
  '운영진',
  '운영팀',
  '관리자팀',
  '스태프',
  '공식',
  '고객센터',
  '문의센터',
  '지원팀',
  '보안팀',
  '시스템',
  '시스템봇',
  '운영봇',
  '관리자봇',
]);

const IMPERSONATION_STRONG_CONTAINS = [
  'admin',
  'administrator',
  'superadmin',
  'official',
  'support',
  'helpdesk',
  'security',
  'operator',
  '관리자',
  '운영자',
  '운영진',
  '운영팀',
  '관리자팀',
  '공식',
  '고객센터',
  '문의센터',
  '지원팀',
  '보안팀',
  '시스템봇',
  '운영봇',
  '관리자봇',
];

const BRAND_EXACT = new Set([
  'tennisflow',
  'tennis flow',
  'tennisflowshop',
  '테니스플로우',
  '테니스 플로우',
  '테니스플로우샵',
  'tennisflowofficial',
  '공식테니스플로우',
]);

const SYSTEM_ROUTE_EXACT = new Set([
  'api',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'me',
  'mypage',
  'admin',
  'board',
  'notice',
  'qna',
  'market',
  'gear',
  'hot',
  'cart',
  'checkout',
  'order',
  'orders',
  'message',
  'messages',
  'review',
  'reviews',
  'rental',
  'rentals',
  '공지',
  '주문',
  '결제',
  '메시지',
  '리뷰',
  '마이페이지',
]);

const CONFUSING_EXACT = new Set(['null', 'undefined', 'unknown', 'anonymous', 'guest', 'deleted', 'test', 'systemuser']);

export function getReservedDisplayNameReason(name: string): ReservedCategory | null {
  const normalized = normalizeDisplayNameInput(name);
  const compact = normalizeDisplayNameForComparison(name);

  if (!normalized) return null;

  if (IMPERSONATION_EXACT.has(normalized) || IMPERSONATION_EXACT.has(compact)) {
    return 'impersonation';
  }

  if (
    IMPERSONATION_STRONG_CONTAINS.some((keyword) => {
      const normalizedKeyword = normalizeDisplayNameInput(keyword);
      const compactKeyword = normalizeDisplayNameForComparison(keyword);
      return (
        normalized.startsWith(normalizedKeyword) ||
        compact.startsWith(compactKeyword) ||
        normalized.includes(normalizedKeyword) ||
        compact.includes(compactKeyword)
      );
    })
  ) {
    return 'impersonation';
  }

  if (BRAND_EXACT.has(normalized) || BRAND_EXACT.has(normalizeDisplayNameForComparison(normalized))) {
    return 'brand';
  }

  if (SYSTEM_ROUTE_EXACT.has(normalized) || SYSTEM_ROUTE_EXACT.has(compact)) {
    return 'system_route';
  }

  if (CONFUSING_EXACT.has(normalized) || CONFUSING_EXACT.has(compact)) {
    return 'confusing';
  }

  return null;
}

export function isReservedDisplayName(name: string): boolean {
  return getReservedDisplayNameReason(name) !== null;
}

export function getReservedDisplayNameErrorMessage(name: string): string | null {
  if (!isReservedDisplayName(name)) return null;
  return RESERVED_DISPLAY_NAME_MESSAGE;
}

