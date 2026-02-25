export default function RentalSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="p-3 rounded bg-muted">
          <div className="h-4 w-1/2 bg-muted/70 rounded mb-1" />
          <div className="h-3 w-1/3 bg-muted/80 rounded" />
        </div>
      ))}
    </div>
  );
}
