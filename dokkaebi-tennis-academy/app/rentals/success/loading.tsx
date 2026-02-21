export default function Loading() {
  return (
    <div className="min-h-full bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-card">
      <div className="relative overflow-hidden bg-gradient-to-r from-background via-muted to-card text-white dark:from-background dark:via-muted dark:to-card">
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
