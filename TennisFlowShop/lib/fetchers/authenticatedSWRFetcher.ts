import { refreshOnce } from '@/lib/auth/refresh-mutex';

const AUTH_RETRY_HEADER = { 'x-suppress-auth-expired': '1' } as const;

async function parseJsonResponse<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch (error) {
    throw error instanceof Error ? error : new Error('INVALID_JSON');
  }
}

async function request(url: string, suppressAuthExpiredHeader: boolean): Promise<Response> {
  return fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: suppressAuthExpiredHeader ? AUTH_RETRY_HEADER : undefined,
  });
}

export async function authenticatedSWRFetcher<T>(url: string): Promise<T> {
  let response = await request(url, false);

  if (response.ok) {
    return parseJsonResponse<T>(response);
  }

  if (response.status === 401 || response.status === 403) {
    const refreshResponse = await refreshOnce();
    if (refreshResponse.ok) {
      response = await request(url, true);
      if (response.ok) {
        return parseJsonResponse<T>(response);
      }
    }
  }

  throw new Error(`HTTP_${response.status}`);
}
