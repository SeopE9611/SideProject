import { TablePageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <TablePageSkeleton
      titleWidthClassName="w-40"
      descriptionWidthClassName="w-72"
      statsCount={3}
      rows={5}
    />
  );
}
