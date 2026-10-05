import { refreshOnce } from "@/lib/auth/refresh-mutex";
import {
  createSWRFailure,
  toSWRRequestFailure,
  type SWRHttpError,
} from "@/lib/fetchers/swrRetryPolicy";

const AUTH_RETRY_HEADER = { "x-suppress-auth-expired": "1" } as const;

type TrackingErrorBody = {
  message?: string;
  errorCode?: string;
  statusCode?: number;
};

export type TrackingSWRFetcherError = SWRHttpError;

async function parseJsonResponse<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVALID_JSON";
    throw createSWRFailure(message, { kind: "parse", status: res.status });
  }
}

async function request(url: string, suppressAuthExpiredHeader: boolean): Promise<Response> {
  try {
    return await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: suppressAuthExpiredHeader ? AUTH_RETRY_HEADER : undefined,
    });
  } catch (error) {
    throw toSWRRequestFailure(error);
  }
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

  return createSWRFailure(message, {
    kind: "http",
    status:
      trackingBody && typeof trackingBody.statusCode === "number"
        ? trackingBody.statusCode
        : res.status,
    errorCode:
      trackingBody && typeof trackingBody.errorCode === "string"
        ? trackingBody.errorCode
        : undefined,
    responseBody: body,
  });
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
