import { DetailPageSkeleton } from "@/components/system/loading";

export default function BoardPostDetailLoading() {
  return (
    <DetailPageSkeleton
      sectionCount={2}
      summaryCardCount={4}
      actionButtonCount={2}
      asideVariant="summary"
      className="p-6"
    />
  );
}
