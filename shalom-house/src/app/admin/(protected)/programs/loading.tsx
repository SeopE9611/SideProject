import { AdminListPageSkeleton } from "@/components/admin/admin-page-skeletons";

export default function Loading() {
  return <AdminListPageSkeleton columns={7} filterFields={2} headerActions={2} />;
}
