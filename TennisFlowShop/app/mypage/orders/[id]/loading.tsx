import { DetailPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <DetailPageSkeleton
      sectionCount={2}
      summaryCardCount={2}
      actionButtonCount={0}
      asideVariant="summary"
      className="py-8"
    />
  );
}
