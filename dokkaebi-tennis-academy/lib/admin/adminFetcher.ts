import { ADMIN_CSRF_COOKIE_KEY, ADMIN_CSRF_HEADER_KEY } from '@/lib/admin/adminCsrf';

const ADMIN_HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '요청 값이 올바르지 않습니다.',
  401: '로그인이 필요합니다. 다시 로그인해 주세요.',
  403: '이 작업을 수행할 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  409: '요청이 현재 상태와 충돌합니다.',
  422: '입력값 검증에 실패했습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  502: '게이트웨이 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  503: '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  504: '응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
};

const ADMIN_UNKNOWN_ERROR_MESSAGE = '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
export type AdminMutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class AdminFetchError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'AdminFetchError';
    this.status = status;
    this.payload = payload;
  }
}

function pickPayloadMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as {
    message?: unknown;
    error?: unknown;
    details?: unknown;
  };

  for (const value of [candidate.message, candidate.error, candidate.details]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function getMessageByStatus(status: number) {
  return ADMIN_HTTP_ERROR_MESSAGES[status] ?? ADMIN_UNKNOWN_ERROR_MESSAGE;
}

export function getAdminErrorMessage(error: unknown): string {
  if (error instanceof AdminFetchError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return ADMIN_UNKNOWN_ERROR_MESSAGE;
}

function safeParseResponseBody(rawText: string): unknown {
  const text = rawText.trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readResponsePayload(response: Response): Promise<unknown> {
  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch {
    bodyText = '';
  }

  return safeParseResponseBody(bodyText);
}

function throwIfHttpError(response: Response, payload: unknown) {
  if (response.ok) return;

  const message = pickPayloadMessage(payload) ?? getMessageByStatus(response.status);
  throw new AdminFetchError(message, response.status, payload);
}

function readCookieToken(cookieName: string): string {
  if (typeof document === 'undefined') return '';

  const encodedPrefix = `${encodeURIComponent(cookieName)}=`;
  const pairs = document.cookie ? document.cookie.split('; ') : [];
  for (const pair of pairs) {
    if (!pair.startsWith(encodedPrefix)) continue;
    return decodeURIComponent(pair.slice(encodedPrefix.length));
  }
  return '';
}

function readAdminCsrfToken(): string {
  return readCookieToken(ADMIN_CSRF_COOKIE_KEY);
}

function withAdminCsrfHeader(initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  const csrfToken = readAdminCsrfToken();
  if (csrfToken) {
    headers.set(ADMIN_CSRF_HEADER_KEY, csrfToken);
  }
  return headers;
}

export async function adminFetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: withAdminCsrfHeader(init?.headers),
  });
  const payload = await readResponsePayload(response);
  throwIfHttpError(response, payload);
  return payload as T;
}

export async function adminMutator<T>(url: string, options: Omit<RequestInit, 'method'> & { method: AdminMutationMethod }): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: withAdminCsrfHeader(options.headers),
  });
  const payload = await readResponsePayload(response);
  throwIfHttpError(response, payload);
  return payload as T;
}
