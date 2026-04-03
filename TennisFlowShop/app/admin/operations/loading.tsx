import { TablePageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <TablePageSkeleton
      titleWidthClassName="w-48"
      descriptionWidthClassName="w-80"
      rows={6}
    />
  );
}
