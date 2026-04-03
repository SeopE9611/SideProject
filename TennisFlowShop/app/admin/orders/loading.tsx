import { TablePageSkeleton } from "@/components/system/loading";

export default function OrdersLoading() {
  return (
    <TablePageSkeleton
      titleWidthClassName="w-44"
      descriptionWidthClassName="w-96"
      rows={6}
    />
  );
}
