import { DetailPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <DetailPageSkeleton
      sectionCount={2}
      summaryCardCount={5}
      actionButtonCount={0}
      sectionDensity="dense"
      asideVariant="history"
      className="py-6 lg:py-8"
    />
  );
}
