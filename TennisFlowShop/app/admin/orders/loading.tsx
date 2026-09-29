import AdminListPageSkeleton from "@/components/admin/AdminListPageSkeleton";

export default function OrdersLoading() {
  return (
    <AdminListPageSkeleton
      columnsClassName="grid-cols-[minmax(230px,1.15fr)_minmax(210px,1fr)_minmax(230px,1.05fr)_120px_52px]"
      columnCount={5}
      rows={6}
      filterColumnsClassName="grid-cols-[minmax(420px,1fr)]"
      filterFieldCount={1}
      quickFilterCount={6}
      filterActionCount={2}
      showGuide
    />
  );
}
