export const BOARD_STATUS_GUIDE: Record<number, string> = {
  401: '로그인이 필요합니다. 로그인 후 다시 시도해 주세요.',
  403: '이 작업을 수행할 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

const DEFAULT_ERROR_MESSAGE = '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

// ===== Community/Boards CSRF (Double Submit Cookie) =====
const COMMUNITY_CSRF_COOKIE = 'communityCsrfToken';
const COMMUNITY_CSRF_HEADER = 'x-community-csrf-token';

function shouldAttachCommunityCsrf(url: string) {
  return url.startsWith('/api/boards') || url.startsWith('/api/community');
}

function isMutatingMethod(method?: string) {
  const m = (method ?? 'GET').toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

function readCookie(name: string): string {
  // boardFetcher가 서버에서 호출될 가능성도 있으니 안전가드
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const kv of cookies) {
    const idx = kv.indexOf('=');
    if (idx < 0) continue;
    const k = decodeURIComponent(kv.slice(0, idx));
    if (k !== name) continue;
    return decodeURIComponent(kv.slice(idx + 1));
  }
  return '';
}

function writeCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 30) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

function ensureCommunityCsrfToken(): string {
  const existing = readCookie(COMMUNITY_CSRF_COOKIE);
  if (existing) return existing;

  const token = generateToken();
  writeCookie(COMMUNITY_CSRF_COOKIE, token);
  return token;
}

type ApiErrorPayload = {
  ok?: boolean;
  status?: number;
  message?: string;
  error?: string;
  details?: Array<{ message?: string }>;
};

export class BoardApiError extends Error {
  status: number;
  payload: unknown;

  constructor({ message, status, payload }: { message: string; status: number; payload?: unknown }) {
    super(message);
    this.name = 'BoardApiError';
    this.status = status;
    this.payload = payload;
  }
}

function pickMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const parsed = payload as ApiErrorPayload;

  if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim();
  if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim();

  if (Array.isArray(parsed.details)) {
    const first = parsed.details.find((detail) => typeof detail?.message === 'string' && detail.message.trim());
    if (first?.message) return first.message.trim();
  }

  return null;
}

function parseStatus(responseStatus: number, payload: unknown): number {
  if (payload && typeof payload === 'object') {
    const candidate = (payload as ApiErrorPayload).status;
    if (typeof candidate === 'number') return candidate;
  }
  if (responseStatus >= 100) return responseStatus;
  return 500;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function boardFetcher<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? undefined);

  // /api/boards, /api/community + mutating 메서드만 CSRF 헤더 자동 주입
  if (shouldAttachCommunityCsrf(url) && isMutatingMethod(init.method)) {
    const token = ensureCommunityCsrfToken();
    if (token) headers.set(COMMUNITY_CSRF_HEADER, token);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });

  const payload = await readPayload(response);
  const status = parseStatus(response.status, payload);

  if (!response.ok) {
    throw new BoardApiError({
      status,
      payload,
      message: pickMessage(payload) ?? BOARD_STATUS_GUIDE[status] ?? `${response.status} ${response.statusText || 'Request failed'}`,
    });
  }

  if (payload && typeof payload === 'object' && (payload as ApiErrorPayload).ok === false) {
    throw new BoardApiError({
      status,
      payload,
      message: pickMessage(payload) ?? BOARD_STATUS_GUIDE[status] ?? DEFAULT_ERROR_MESSAGE,
    });
  }

  return payload as T;
}

export function parseApiError(error: unknown, fallbackMessage = DEFAULT_ERROR_MESSAGE): { status?: number; message: string } {
  if (error instanceof BoardApiError) {
    return {
      status: error.status,
      message: error.message || BOARD_STATUS_GUIDE[error.status] || fallbackMessage,
    };
  }

  if (error instanceof Error) {
    return { message: error.message || fallbackMessage };
  }

  if (typeof error === 'string' && error.trim()) {
    return { message: error.trim() };
  }

  return { message: fallbackMessage };
}
