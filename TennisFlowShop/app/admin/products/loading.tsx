import AdminListPageSkeleton from "@/components/admin/AdminListPageSkeleton";

export default function ProductsLoading() {
  return (
    <AdminListPageSkeleton
      columnsClassName="grid-cols-[minmax(280px,1.35fr)_minmax(210px,1fr)_130px_minmax(180px,0.85fr)_116px]"
      columnCount={5}
      rows={10}
      summaryCount={4}
      summaryVariant="strip"
      filterColumnsClassName="grid-cols-[minmax(240px,2fr)_repeat(4,minmax(120px,1fr))]"
      filterFieldCount={5}
      quickFilterCount={7}
      headerActionCount={1}
      filterActionCount={2}
    />
  );
}
