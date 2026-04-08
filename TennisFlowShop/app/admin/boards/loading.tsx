import { TablePageSkeleton } from "@/components/system/loading";

export default function BoardsLoading() {
  return (
    <TablePageSkeleton
      rows={10}
      columnCount={11}
      toolbarVariant="full"
      className="p-6"
    />
  );
}
