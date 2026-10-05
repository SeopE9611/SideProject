import { AdminListPageSkeleton } from "@/components/admin/admin-page-skeletons";

export default function Loading() {
  return <AdminListPageSkeleton columns={6} filterColumns={4} filterFields={4} headerActions={1} />;
}
