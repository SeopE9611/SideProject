import { refreshOnce } from '@/lib/auth/refresh-mutex';
import { debugResumeFetch, getResumeDebugSnapshot, warnResumeFetchFailure } from '@/lib/debug/resume-debug';

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

function getPath(url: string): string {
  if (typeof window === 'undefined') return url;
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
}

function classifyHttpError(status: number): string {
  if (status === 401) return 'http_401';
  if (status === 403) return 'http_403';
  if (status === 500) return 'http_500';
  if (status === 503) return 'http_503';
  return `http_${status}`;
}

function toFailurePayload(params: {
  url: string;
  firstStatus: number | null;
  retryStatus: number | null;
  refreshAttempted: boolean;
  refreshSucceeded: boolean;
  errorType: string;
}) {
  const snapshot = getResumeDebugSnapshot();

  return {
    path: getPath(params.url),
    firstStatus: params.firstStatus,
    retryStatus: params.retryStatus,
    refreshAttempted: params.refreshAttempted,
    refreshSucceeded: params.refreshSucceeded,
    errorType: params.errorType,
    online: snapshot.online,
    visibilityState: snapshot.visibilityState,
    wasRecentlyResumed: snapshot.wasRecentlyResumed,
    timestamps: {
      lastVisibilityChangeAt: snapshot.lastVisibilityChangeAt,
      lastHiddenAt: snapshot.lastHiddenAt,
      lastVisibleAt: snapshot.lastVisibleAt,
      lastPageShowAt: snapshot.lastPageShowAt,
      lastOnlineAt: snapshot.lastOnlineAt,
    },
  };
}

export async function authenticatedSWRFetcher<T>(url: string): Promise<T> {
  let firstStatus: number | null = null;
  let retryStatus: number | null = null;
  let refreshAttempted = false;
  let refreshSucceeded = false;

  let response: Response;

  try {
    response = await request(url, false);
  } catch (error) {
    const errorType = error instanceof DOMException && error.name === 'AbortError' ? 'aborted_request' : 'network_error';
    warnResumeFetchFailure(
      toFailurePayload({
        url,
        firstStatus,
        retryStatus,
        refreshAttempted,
        refreshSucceeded,
        errorType,
      }),
    );
    throw error;
  }

  if (response.ok) {
    return parseJsonResponse<T>(response);
  }

  firstStatus = response.status;

  if (response.status === 401 || response.status === 403) {
    refreshAttempted = true;

    try {
      const refreshResponse = await refreshOnce();
      refreshSucceeded = refreshResponse.ok;
      if (refreshResponse.ok) {
        response = await request(url, true);
        retryStatus = response.status;
        if (response.ok) {
          debugResumeFetch('retry_success_after_refresh',
            toFailurePayload({
              url,
              firstStatus,
              retryStatus,
              refreshAttempted,
              refreshSucceeded,
              errorType: 'retry_succeeded_after_refresh',
            }),
          );
          return parseJsonResponse<T>(response);
        }

        warnResumeFetchFailure(
          toFailurePayload({
            url,
            firstStatus,
            retryStatus,
            refreshAttempted,
            refreshSucceeded,
            errorType: 'retry_failed_after_refresh',
          }),
        );
      } else {
        warnResumeFetchFailure(
          toFailurePayload({
            url,
            firstStatus,
            retryStatus,
            refreshAttempted,
            refreshSucceeded,
            errorType: 'refresh_failed',
          }),
        );
      }
    } catch (error) {
      const errorType = error instanceof DOMException && error.name === 'AbortError' ? 'aborted_request' : 'network_error';
      warnResumeFetchFailure(
        toFailurePayload({
          url,
          firstStatus,
          retryStatus,
          refreshAttempted,
          refreshSucceeded,
          errorType,
        }),
      );
      throw error;
    }
  } else {
    warnResumeFetchFailure(
      toFailurePayload({
        url,
        firstStatus,
        retryStatus,
        refreshAttempted,
        refreshSucceeded,
        errorType: classifyHttpError(response.status),
      }),
    );
  }

  throw new Error(`HTTP_${response.status}`);
}
