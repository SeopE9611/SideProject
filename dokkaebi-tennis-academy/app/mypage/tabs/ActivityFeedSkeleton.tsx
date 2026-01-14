export default function ActivityFeedSkeleton() {
  return (
    <div className="space-y-5 bp-sm:space-y-6 bp-lg:space-y-8 animate-pulse">
      {/* 통계 카드 스켈레톤 */}
      <div className="grid grid-cols-2 bp-md:grid-cols-4 gap-3 bp-sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bp-sm:rounded-2xl bg-slate-100 dark:bg-slate-800/50 p-4 bp-sm:p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-slate-200 dark:bg-slate-700 h-8 w-8 bp-sm:h-10 bp-sm:w-10" />
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* 필터 스켈레톤 */}
      <div className="space-y-4">
        <div className="h-11 bp-sm:h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700" />
        <div className="flex flex-wrap gap-2 bp-sm:gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-20 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
            />
          ))}
        </div>
      </div>

      {/* 활동 카드 스켈레톤 */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <div className="h-8 w-32 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700" />
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="rounded-xl bp-sm:rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 bp-sm:p-6">
              <div className="flex flex-col bp-sm:flex-row bp-sm:items-start gap-4">
                <div className="rounded-xl bg-slate-100 dark:bg-slate-700 h-14 w-14 bp-sm:h-16 bp-sm:w-16 shrink-0" />

                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-20 rounded-md bg-slate-200 dark:bg-slate-700" />
                      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
