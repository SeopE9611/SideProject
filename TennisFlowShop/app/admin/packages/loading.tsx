import { TablePageSkeleton } from "@/components/system/loading";

export default function AdminPackagesLoading() {
  return <TablePageSkeleton rows={8} columnCount={8} toolbarVariant="full" />;
}
