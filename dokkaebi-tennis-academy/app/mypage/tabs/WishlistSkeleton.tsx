export default function WishlistSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="animate-pulse flex justify-between items-center border-b pb-4 last:border-b-0 last:pb-0">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
