import { API_BASE_URL } from "../config/env";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "omit",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    let message = `요청에 실패했습니다. (${response.status})`;

    try {
      const data = (await response.json()) as {
        message?: unknown;
      };

      if (typeof data.message === "string" && data.message.trim()) {
        message = data.message.trim();
      }
    } catch {
      // JSON 오류 응답이 아니면 기본 메시지 사용
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
