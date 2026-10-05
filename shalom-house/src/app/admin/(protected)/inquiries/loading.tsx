import { AdminListPageSkeleton } from "@/components/admin/admin-page-skeletons";

export default function Loading() {
  return <AdminListPageSkeleton columns={7} filterColumns={2} filterFields={2} headerActions={0} summaryItems={5} />;
}
