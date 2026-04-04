import { TablePageSkeleton } from "@/components/system/loading";

export default function ReviewsLoading() {
  return (
    <TablePageSkeleton
      titleWidthClassName="w-48"
      descriptionWidthClassName="w-96"
      rows={5}
      columnCount={7}
      toolbarVariant="compact"
      className="px-0"
    />
  );
}
