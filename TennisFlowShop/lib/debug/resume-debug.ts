const RESUME_DEBUG_KEY = '__resumeDebug';
const RECENT_RESUME_WINDOW_MS = 5000;

type ResumeDebugState = {
  lastVisibilityChangeAt: number | null;
  lastHiddenAt: number | null;
  lastVisibleAt: number | null;
  lastPageShowAt: number | null;
  lastOnlineAt: number | null;
  online: boolean | null;
};

type ResumeDebugWindow = Window & {
  [RESUME_DEBUG_KEY]?: ResumeDebugState;
};

export type ResumeDebugSnapshot = ResumeDebugState & {
  now: number;
  visibilityState: DocumentVisibilityState | 'unknown';
  wasRecentlyResumed: boolean;
};

function getDefaultState(): ResumeDebugState {
  return {
    lastVisibilityChangeAt: null,
    lastHiddenAt: null,
    lastVisibleAt: null,
    lastPageShowAt: null,
    lastOnlineAt: null,
    online: null,
  };
}

function getWindow(): ResumeDebugWindow | null {
  if (typeof window === 'undefined') return null;
  return window as ResumeDebugWindow;
}

export function getResumeDebugSnapshot(): ResumeDebugSnapshot {
  const now = Date.now();
  const win = getWindow();
  const state = win?.[RESUME_DEBUG_KEY] ?? getDefaultState();
  const visibilityState = typeof document === 'undefined' ? 'unknown' : document.visibilityState;
  const latestResumeAt = Math.max(state.lastVisibleAt ?? 0, state.lastPageShowAt ?? 0);

  return {
    ...state,
    now,
    visibilityState,
    wasRecentlyResumed: latestResumeAt > 0 && now - latestResumeAt <= RECENT_RESUME_WINDOW_MS,
  };
}

export function debugResumeFetch(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'development') return;
  console.debug(`[resume-debug] ${event}`, payload);
}

export function warnResumeFetchFailure(payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[resume-debug] fetch failure', payload);
    return;
  }

  if ((payload.errorType as string | undefined) === 'refresh_failed') {
    console.warn('[resume-debug] refresh_failed', {
      path: payload.path,
      status: payload.retryStatus ?? payload.firstStatus,
    });
  }
}
