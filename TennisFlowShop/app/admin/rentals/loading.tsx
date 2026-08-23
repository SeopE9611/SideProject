import AdminListPageSkeleton from "@/components/admin/AdminListPageSkeleton";

export default function Loading() {
  return (
    <AdminListPageSkeleton
      columnsClassName="grid-cols-[minmax(220px,1.1fr)_minmax(210px,1fr)_minmax(230px,1.05fr)_130px_52px]"
      columnCount={5}
      rows={6}
      filterColumnsClassName="grid-cols-[minmax(240px,2fr)_repeat(3,minmax(130px,1fr))]"
      filterFieldCount={4}
      secondaryFilterFieldCount={2}
      secondaryFilterActionCount={4}
      quickFilterCount={5}
      filterActionCount={1}
      showGuide
      guideVariant="summary"
    />
  );
}
