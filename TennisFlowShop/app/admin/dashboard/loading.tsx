import { TablePageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return <TablePageSkeleton statsCount={4} rows={5} columnCount={4} toolbarVariant="none" />;
}
