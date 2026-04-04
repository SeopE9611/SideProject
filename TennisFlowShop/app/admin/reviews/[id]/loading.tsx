import { DetailPageSkeleton } from "@/components/system/loading";

export default function ReviewDetailLoading() {
  return (
    <DetailPageSkeleton
      sectionCount={2}
      summaryCardCount={2}
      actionButtonCount={1}
      sectionDensity="dense"
      asideVariant="none"
      className="py-6 lg:py-8"
    />
  );
}
