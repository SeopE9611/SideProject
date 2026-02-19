export default function Loading() {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white dark:from-green-700 dark:via-emerald-700 dark:to-teal-700">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        <div className="relative container py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-card/20 dark:bg-card/30 backdrop-blur-sm rounded-full mb-6 animate-pulse"></div>
            <div className="h-12 w-96 mx-auto bg-card/20 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-96 bg-card/80 dark:bg-card rounded-xl animate-pulse"></div>
          <div className="h-64 bg-card/80 dark:bg-card rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
