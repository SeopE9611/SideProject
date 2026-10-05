type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none ${className ?? ""}`}
    />
  );
}
