import { API_BASE_URL } from "../config/env";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getErrorMessage(response: Response) {
  let message = `요청에 실패했습니다. (${response.status})`;

  try {
    const data = (await response.json()) as {
      message?: unknown;
    };

    if (typeof data.message === "string" && data.message.trim()) {
      message = data.message.trim();
    }
  } catch {
    // JSON 오류 응답이 아니면
    // 기본 메시지를 사용합니다.
  }

  return message;
}

export async function getJson<T>(path: string, signal?: AbortSignal, headers?: HeadersInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...headers,
    },
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function postJson<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  signal?: AbortSignal,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as TResponse;
}
