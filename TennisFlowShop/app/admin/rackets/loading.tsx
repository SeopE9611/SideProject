import AdminListPageSkeleton from "@/components/admin/AdminListPageSkeleton";

export default function AdminRacketsLoading() {
  return (
    <AdminListPageSkeleton
      columnsClassName="grid-cols-[minmax(280px,1.3fr)_minmax(210px,0.95fr)_140px_minmax(220px,1fr)_116px]"
      columnCount={5}
      rows={8}
      summaryCount={4}
      summaryVariant="strip"
      filterColumnsClassName="grid-cols-[minmax(240px,2fr)_repeat(3,minmax(130px,1fr))]"
      filterFieldCount={4}
      quickFilterCount={8}
      headerActionCount={1}
      filterActionCount={2}
    />
  );
}
