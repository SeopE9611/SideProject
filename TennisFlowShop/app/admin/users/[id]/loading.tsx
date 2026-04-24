import { DetailPageSkeleton } from "@/components/system/loading";

export default function AdminUserDetailLoading() {
  return <DetailPageSkeleton sectionCount={4} summaryCardCount={3} asideVariant="summary" />;
}
