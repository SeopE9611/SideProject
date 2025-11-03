export default function RentalSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="p-3 border rounded bg-gray-100">
          <div className="h-4 w-1/2 bg-gray-300 rounded mb-1" />
          <div className="h-3 w-1/3 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
