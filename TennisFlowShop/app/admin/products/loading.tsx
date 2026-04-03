import { TablePageSkeleton } from "@/components/system/loading";

export default function ProductsLoading() {
  return (
    <TablePageSkeleton
      titleWidthClassName="w-52"
      descriptionWidthClassName="w-[28rem]"
      statsCount={4}
      rows={10}
    />
  );
}
