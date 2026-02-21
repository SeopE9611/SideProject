export default function Loading() {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-muted to-card dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-background via-muted to-card text-white dark:from-background dark:via-muted dark:to-card">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        <div className="relative container py-16">
          <div className="h-12 w-64 bg-card/20 rounded-lg animate-pulse"></div>
        </div>
      </div>
      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-card/80 dark:bg-card rounded-xl animate-pulse"></div>
            <div className="h-96 bg-card/80 dark:bg-card rounded-xl animate-pulse"></div>
          </div>
          <div className="lg:col-span-1">
            <div className="h-96 bg-card/90 dark:bg-card rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
