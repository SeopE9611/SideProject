import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CatalogCardFrame } from "./CatalogCardFrame";

type Props = {
  viewMode: "grid" | "list";
  count?: number;
  actionCount?: 1 | 2 | 3;
  mediaAspectClassName?: string;
};

function One({
  viewMode,
  actionCount = 2,
  mediaAspectClassName = "aspect-[4/3]",
}: {
  viewMode: "grid" | "list";
  actionCount?: 1 | 2 | 3;
  mediaAspectClassName?: string;
}) {
  return (
    <CatalogCardFrame
      viewMode={viewMode}
      media={<Skeleton aria-hidden="true" className={cn("w-full rounded-none", mediaAspectClassName)} />}
      content={
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      }
      price={<div className="space-y-2"><Skeleton className="h-6 w-28 bp-md:ml-auto" /><Skeleton className="h-4 w-20 bp-md:ml-auto" /></div>}
      actions={<div className="grid w-full gap-2">{Array.from({ length: actionCount }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-control" />)}</div>}
    />
  );
}

export function CatalogCardSkeleton({
  viewMode,
  count = viewMode === "grid" ? 12 : 4,
  actionCount = 2,
  mediaAspectClassName = "aspect-[4/3]",
}: Props) {
  return <>{Array.from({ length: count }).map((_, i) => <One key={i} viewMode={viewMode} actionCount={actionCount} mediaAspectClassName={mediaAspectClassName} />)}</>;
}
