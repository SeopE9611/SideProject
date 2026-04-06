import { CardListPageSkeleton } from "@/components/system/loading";

export default function ApplicationsLoading() {
  return <CardListPageSkeleton cardCount={3} columns={1} showToolbar={false} />;
}
