export default function UserSectionSkeleton() {
  return (
    <div className="border p-4 rounded-lg shadow-sm bg-card animate-pulse">
      <div className="h-5 w-1/3 bg-muted/70 rounded mb-2" />
      <div className="h-4 w-2/3 bg-muted/80 rounded mb-1" />
      <div className="h-4 w-full bg-muted/80 rounded mt-4" />
    </div>
  );
}
