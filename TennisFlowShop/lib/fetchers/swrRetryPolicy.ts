import type { SWRConfiguration } from "swr";

export type SWRFailureKind = "http" | "network" | "abort" | "parse";

export type SWRHttpError = Error & {
  status?: number;
  errorCode?: string;
  responseBody?: unknown;
  kind: SWRFailureKind;
};

export const SWR_MAX_RETRIES = 2;
export const SWR_RETRY_BASE_DELAY_MS = 1_000;
export const SWR_RETRY_MAX_DELAY_MS = 5_000;

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function createSWRFailure(
  message: string,
  details: Omit<Partial<SWRHttpError>, "name" | "message" | "kind"> & {
    kind: SWRFailureKind;
  },
): SWRHttpError {
  return Object.assign(new Error(message), details) as SWRHttpError;
}

export function toSWRRequestFailure(error: unknown): SWRHttpError {
  if (error instanceof Error && error.name === "AbortError") {
    return createSWRFailure(error.message || "요청이 취소되었습니다.", { kind: "abort" });
  }

  const message = error instanceof Error ? error.message : "네트워크 요청에 실패했습니다.";
  return createSWRFailure(message, { kind: "network" });
}

export function isRetryableSWRFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const failure = error as Partial<SWRHttpError>;
  if (failure.kind === "abort" || failure.kind === "parse") return false;
  if (failure.kind === "network") return true;
  if (failure.kind === "http" && typeof failure.status === "number") {
    return RETRYABLE_HTTP_STATUSES.has(failure.status);
  }
  return false;
}

export function getSWRRetryDelay(retryCount: number, random = Math.random): number {
  const exponent = Math.max(0, retryCount - 1);
  const exponentialDelay = SWR_RETRY_BASE_DELAY_MS * 2 ** exponent;
  const jitter = Math.floor(random() * 250);
  return Math.min(exponentialDelay + jitter, SWR_RETRY_MAX_DELAY_MS);
}

export const swrTransientRetryConfig: SWRConfiguration = {
  shouldRetryOnError: isRetryableSWRFailure,
  onErrorRetry: (error, _key, _config, revalidate, revalidateOptions) => {
    if (!isRetryableSWRFailure(error) || revalidateOptions.retryCount > SWR_MAX_RETRIES) return;

    const delay = getSWRRetryDelay(revalidateOptions.retryCount);
    setTimeout(() => revalidate(revalidateOptions), delay);
  },
};
