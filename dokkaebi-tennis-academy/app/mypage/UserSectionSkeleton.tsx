export default function UserSectionSkeleton() {
  return (
    <div className="border p-4 rounded-lg shadow-sm bg-white animate-pulse">
      <div className="h-5 w-1/3 bg-gray-300 rounded mb-2" />
      <div className="h-4 w-2/3 bg-gray-200 rounded mb-1" />
      <div className="h-4 w-full bg-gray-200 rounded mt-4" />
    </div>
  );
}
