export default function RacketDetailLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="relative bg-muted/30 h-32 animate-pulse" />
      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="aspect-square bg-muted/80 dark:bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-muted/80 dark:bg-muted rounded-lg animate-pulse" />
            <div className="h-48 bg-muted/80 dark:bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
