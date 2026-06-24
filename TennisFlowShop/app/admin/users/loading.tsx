import { TablePageSkeleton } from "@/components/system/loading";

export default function AdminUsersLoading() {
  return <TablePageSkeleton rows={8} columnCount={7} toolbarVariant="full" className="p-6" />;
}
