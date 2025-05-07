export default function ReviewListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-md border p-4 space-y-2">
          <div className="h-3 w-1/4 bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
          <div className="h-3 w-1/6 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
