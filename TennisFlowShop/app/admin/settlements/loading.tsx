import { TablePageSkeleton } from "@/components/system/loading";

export default function AdminSettlementsLoading() {
  return <TablePageSkeleton rows={8} columnCount={7} toolbarVariant="full" />;
}
