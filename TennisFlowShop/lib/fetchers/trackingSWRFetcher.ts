import { refreshOnce } from "@/lib/auth/refresh-mutex";

const AUTH_RETRY_HEADER = { "x-suppress-auth-expired": "1" } as const;

type TrackingErrorBody = {
  message?: string;
  errorCode?: string;
  statusCode?: number;
};

export type TrackingSWRFetcherError = Error & {
  status?: number;
  errorCode?: string;
  responseBody?: unknown;
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch (error) {
    throw error instanceof Error ? error : new Error("INVALID_JSON");
  }
}

async function request(
  url: string,
  suppressAuthExpiredHeader: boolean,
): Promise<Response> {
  return fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: suppressAuthExpiredHeader ? AUTH_RETRY_HEADER : undefined,
  });
}

async function safeReadErrorBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function buildTrackingError(res: Response, body: unknown): TrackingSWRFetcherError {
  const trackingBody = body as TrackingErrorBody | null;
  const message =
    trackingBody && typeof trackingBody.message === "string" && trackingBody.message.trim()
      ? trackingBody.message
      : `HTTP_${res.status}`;

  const error = new Error(message) as TrackingSWRFetcherError;
  error.status =
    trackingBody && typeof trackingBody.statusCode === "number"
      ? trackingBody.statusCode
      : res.status;
  error.errorCode =
    trackingBody && typeof trackingBody.errorCode === "string"
      ? trackingBody.errorCode
      : undefined;
  error.responseBody = body;
  return error;
}

export async function trackingSWRFetcher<T>(url: string): Promise<T> {
  let response = await request(url, false);

  if ((response.status === 401 || response.status === 403) && !response.ok) {
    const refreshResponse = await refreshOnce();
    if (refreshResponse.ok) {
      response = await request(url, true);
    }
  }

  if (response.ok) {
    return parseJsonResponse<T>(response);
  }

  const body = await safeReadErrorBody(response);
  throw buildTrackingError(response, body);
}
