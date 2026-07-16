import { Skeleton } from "@/components/ui/skeleton";
import { CatalogCardFrame } from "./CatalogCardFrame";

type Props = { viewMode: "grid" | "list"; count?: number };
function One({ viewMode }: { viewMode: "grid" | "list" }) { return <CatalogCardFrame viewMode={viewMode} media={<Skeleton className="aspect-[4/3] w-full rounded-xl" />} content={<div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-32" /><Skeleton className="h-16 w-full rounded-xl" /></div>} price={<div className="space-y-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-4 w-20" /></div>} actions={<div className="grid w-full gap-2"><Skeleton className="h-10 w-full rounded-control" /><Skeleton className="h-10 w-full rounded-control" /></div>} />; }
export function CatalogCardSkeleton({ viewMode, count = viewMode === "grid" ? 12 : 4 }: Props) { return <>{Array.from({ length: count }).map((_, i) => <One key={i} viewMode={viewMode} />)}</>; }
