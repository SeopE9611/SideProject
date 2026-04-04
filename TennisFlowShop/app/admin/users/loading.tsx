import { TablePageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <TablePageSkeleton
      titleWidthClassName="w-40"
      descriptionWidthClassName="w-64"
      statsCount={4}
      rows={8}
      columnCount={6}
      toolbarVariant="full"
    />
  );
}
