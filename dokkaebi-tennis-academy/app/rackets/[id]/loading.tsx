export default function RacketDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-32 animate-pulse" />
      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
