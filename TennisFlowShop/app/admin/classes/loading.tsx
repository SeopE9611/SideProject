import { CardListPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return <CardListPageSkeleton cardCount={6} columns={1} showToolbar />;
}
