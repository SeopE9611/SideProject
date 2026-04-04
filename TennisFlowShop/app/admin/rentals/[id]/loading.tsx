import { DetailPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/30">
      <DetailPageSkeleton
        sectionCount={3}
        summaryCardCount={4}
        actionButtonCount={2}
        sectionDensity="dense"
        asideVariant="history"
        className="py-6 lg:py-8"
      />
    </div>
  );
}
