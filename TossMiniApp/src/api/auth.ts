import { API_BASE_URL } from "../config/env";

const AUTH_PATH = "/api/apps-in-toss/auth";

export type AppsAuthUser = {
  id: string;
  name: string;
};

export type AppsLoginResult = {
  sessionToken: string;
  expiresAt: string;
  user: AppsAuthUser;
};

export class AppsAuthApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AppsAuthApiError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseUser(value: unknown): AppsAuthUser | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  return { id: value.id, name: value.name };
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestAuth(path: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${AUTH_PATH}${path}`, {
    ...init,
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });
  const data = await readResponse(response);

  if (!response.ok) {
    const message = isRecord(data) && typeof data.message === "string" ? data.message : `요청에 실패했습니다. (${response.status})`;
    const code = isRecord(data) && typeof data.code === "string" ? data.code : undefined;
    throw new AppsAuthApiError(message, response.status, code);
  }

  return data;
}

export async function loginWithAuthorizationCode(
  authorizationCode: string,
  referrer: "DEFAULT" | "SANDBOX",
): Promise<AppsLoginResult> {
  const data = await requestAuth("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorizationCode, referrer }),
  });

  if (!isRecord(data) || data.success !== true || typeof data.sessionToken !== "string" || typeof data.expiresAt !== "string") {
    throw new AppsAuthApiError("로그인 응답을 확인하지 못했습니다.", 0);
  }

  const user = parseUser(data.user);
  if (!user) {
    throw new AppsAuthApiError("로그인 사용자 정보를 확인하지 못했습니다.", 0);
  }

  return { sessionToken: data.sessionToken, expiresAt: data.expiresAt, user };
}

export async function getAppsInTossMe(sessionToken: string): Promise<AppsAuthUser> {
  const data = await requestAuth("/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const user = isRecord(data) && "user" in data ? parseUser(data.user) : parseUser(data);

  if (!user) {
    throw new AppsAuthApiError("로그인 사용자 정보를 확인하지 못했습니다.", 0);
  }

  return user;
}

export async function logoutAppsInToss(sessionToken: string): Promise<void> {
  await requestAuth("/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
}
