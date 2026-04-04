import { DetailPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <DetailPageSkeleton
      sectionCount={2}
      summaryCardCount={4}
      actionButtonCount={2}
      asideVariant="none"
      className="py-10"
    />
  );
}
