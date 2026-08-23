import AdminListPageSkeleton from "@/components/admin/AdminListPageSkeleton";

export default function AdminPackagesLoading() {
  return (
    <AdminListPageSkeleton
      columnsClassName="grid-cols-[minmax(240px,1.15fr)_minmax(300px,1.35fr)_minmax(240px,1fr)_130px_52px]"
      columnCount={5}
      rows={8}
      summaryCount={5}
      summaryVariant="cards"
      filterColumnsClassName="grid-cols-[minmax(280px,1.6fr)_repeat(3,minmax(150px,1fr))]"
      filterFieldCount={4}
      quickFilterCount={6}
      filterActionCount={2}
    />
  );
}
