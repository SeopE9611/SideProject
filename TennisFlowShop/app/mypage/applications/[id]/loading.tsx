import { DetailPageSkeleton } from "@/components/system/loading";

export default function ApplicationDetailLoading() {
  return (
    <DetailPageSkeleton
      sectionCount={3}
      summaryCardCount={4}
      actionButtonCount={1}
      sectionDensity="dense"
      asideVariant="summary"
      className="py-6 lg:py-8"
    />
  );
}
