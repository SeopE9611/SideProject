// lib/logger.ts (상단 근처에 추가)
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as LogBase['level'];
const rank = { debug: 10, info: 20, warn: 30, error: 40 } as const;
const enabled = (lvl: LogBase['level']) => rank[lvl] >= (rank[LOG_LEVEL] ?? 20);

export function logInfo(data: Omit<LogBase, 'level'>) {
  if (!enabled('info')) return;
  jlog({ level: 'info', ...data });
}

// 가벼운 구조화 로거 (console 기반). 필요하면 pino/winston으로 교체 가능.
export type LogBase = {
  level: 'info' | 'error' | 'warn' | 'debug';
  msg: string;
  requestId?: string | null;
  userId?: string | null;
  docId?: string | null;
  path?: string | null;
  method?: string | null;
  status?: number | null;
  durationMs?: number | null;
  extra?: Record<string, unknown>;
};

function jlog(payload: LogBase) {
  try {
    // 한 줄 JSON 로그
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  } catch {
    // eslint-disable-next-line no-console
    console.log(payload);
  }
}

export function startTimer() {
  const t0 = performance.now();
  return () => Math.round(performance.now() - t0);
}

// export function logInfo(data: Omit<LogBase, 'level'>) {
//   jlog({ level: 'info', ...data });
// }

export function logError(data: Omit<LogBase, 'level'> & { error?: unknown }) {
  const extra = { ...(data.extra || {}), error: serializeError(data.error) };
  jlog({ level: 'error', ...data, extra });
}

function serializeError(err: unknown) {
  if (!err) return null;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

// 요청 메타 수집 헬퍼
export function reqMeta(req: Request) {
  const requestId = req.headers.get('x-request-id') ?? null;
  const method = (req as any).method ?? null;
  const path = (req as any).url ?? null;
  return { requestId, method, path };
}
