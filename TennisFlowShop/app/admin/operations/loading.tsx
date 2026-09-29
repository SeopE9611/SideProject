import AdminListPageSkeleton from "@/components/admin/AdminListPageSkeleton";

export default function Loading() {
  return (
    <AdminListPageSkeleton
      columnsClassName="grid-cols-[130px_minmax(220px,1.15fr)_minmax(210px,1fr)_minmax(180px,0.85fr)_52px]"
      columnCount={5}
      rows={6}
      summaryCount={3}
      summaryVariant="cards"
      filterColumnsClassName="grid-cols-[minmax(360px,1fr)]"
      filterFieldCount={1}
      quickFilterCount={7}
      headerActionCount={2}
      showGuide
    />
  );
}
