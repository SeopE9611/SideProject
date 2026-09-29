type ApiPerfMark = {
  name: string;
  ms: number;
};

const DEFAULT_SLOW_API_THRESHOLD_MS = 800;

function shouldLog(totalMs: number) {
  if (process.env.API_PERF_LOG === "1") return true;
  const threshold = Number(process.env.API_SLOW_LOG_MS);
  const slowThreshold =
    Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_SLOW_API_THRESHOLD_MS;
  return totalMs >= slowThreshold;
}

export function createApiPerfLogger(route: string) {
  const start = performance.now();
  const marks: ApiPerfMark[] = [];

  return {
    async measure<T>(name: string, work: Promise<T> | (() => Promise<T> | T)) {
      const markStart = performance.now();
      try {
        return await (typeof work === "function" ? work() : work);
      } finally {
        marks.push({ name, ms: performance.now() - markStart });
      }
    },
    log(extra?: Record<string, unknown>) {
      const totalMs = performance.now() - start;
      if (!shouldLog(totalMs)) return;

      console.info("[api-perf]", {
        route,
        totalMs: Number(totalMs.toFixed(1)),
        marks: Object.fromEntries(marks.map((mark) => [mark.name, Number(mark.ms.toFixed(1))])),
        ...extra,
      });
    },
  };
}
