import { appLogin } from "@apps-in-toss/web-framework";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import {
  AppsAuthApiError,
  getAppsInTossMe,
  loginWithAuthorizationCode,
  logoutAppsInToss,
  type AppsAuthUser,
} from "../api/auth";

export type AppsAuthState =
  | { status: "anonymous" }
  | { status: "authenticated"; user: AppsAuthUser; sessionToken: string; expiresAt: string };

type AppsInTossAuthValue = AppsAuthState & {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  getMe: () => Promise<AppsAuthUser | null>;
};

export class AppsLoginBridgeError extends Error {
  constructor() {
    super("토스 로그인을 완료하지 못했습니다.");
    this.name = "AppsLoginBridgeError";
  }
}

const AppsInTossAuthContext = createContext<AppsInTossAuthValue | null>(null);

export function AppsInTossAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AppsAuthState>({ status: "anonymous" });

  const clearSession = useCallback(() => {
    setAuthState({ status: "anonymous" });
  }, []);

  const login = useCallback(async () => {
    let loginResult: Awaited<ReturnType<typeof appLogin>>;

    try {
      loginResult = await appLogin();
    } catch {
      throw new AppsLoginBridgeError();
    }

    const result = await loginWithAuthorizationCode(loginResult.authorizationCode, loginResult.referrer);
    const expiresAt = Date.parse(result.expiresAt);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearSession();
      throw new AppsAuthApiError("로그인 세션이 이미 만료되었습니다.", 0);
    }

    setAuthState({ status: "authenticated", ...result });
  }, [clearSession]);

  const getMe = useCallback(async () => {
    if (authState.status !== "authenticated") {
      return null;
    }

    if (Date.parse(authState.expiresAt) <= Date.now()) {
      clearSession();
      return null;
    }

    try {
      return await getAppsInTossMe(authState.sessionToken);
    } catch (error) {
      if (error instanceof AppsAuthApiError && error.status === 401) {
        clearSession();
      }
      throw error;
    }
  }, [authState, clearSession]);

  const logout = useCallback(async () => {
    if (authState.status !== "authenticated") {
      clearSession();
      return;
    }

    try {
      if (Date.parse(authState.expiresAt) > Date.now()) {
        await logoutAppsInToss(authState.sessionToken);
      }
    } finally {
      clearSession();
    }
  }, [authState, clearSession]);

  return (
    <AppsInTossAuthContext.Provider value={{ ...authState, login, logout, clearSession, getMe }}>
      {children}
    </AppsInTossAuthContext.Provider>
  );
}

export function useAppsInTossAuth() {
  const context = useContext(AppsInTossAuthContext);

  if (!context) {
    throw new Error("AppsInTossAuthProvider 안에서 사용해야 합니다.");
  }

  return context;
}
