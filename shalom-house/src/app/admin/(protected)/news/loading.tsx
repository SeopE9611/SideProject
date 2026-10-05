import { AdminListPageSkeleton } from "@/components/admin/admin-page-skeletons";

export default function Loading() {
  return <AdminListPageSkeleton columns={6} filterFields={3} headerActions={2} />;
}
