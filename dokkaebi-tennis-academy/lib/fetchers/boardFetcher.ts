export const BOARD_STATUS_GUIDE: Record<number, string> = {
  401: '로그인이 필요합니다. 로그인 후 다시 시도해 주세요.',
  403: '이 작업을 수행할 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

const DEFAULT_ERROR_MESSAGE = '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

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

export async function boardFetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
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
