import AdminListPageSkeleton from "@/components/admin/AdminListPageSkeleton";

export default function AdminUsersLoading() {
  return (
    <AdminListPageSkeleton
      columnsClassName="grid-cols-[40px_minmax(260px,1.3fr)_minmax(250px,1.15fr)_minmax(190px,0.85fr)_minmax(170px,0.75fr)_116px]"
      columnCount={6}
      rows={8}
      summaryCount={5}
      summaryVariant="cards"
      filterColumnsClassName="grid-cols-[minmax(300px,2fr)_repeat(5,minmax(120px,1fr))]"
      filterFieldCount={6}
      filterActionCount={1}
      selectionColumn
    />
  );
}
