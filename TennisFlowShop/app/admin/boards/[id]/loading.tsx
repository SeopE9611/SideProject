import { DetailPageSkeleton } from "@/components/system/loading";
import AdminPageShell from "@/components/admin/AdminPageShell";

export default function BoardPostDetailLoading() {
  return (
    <AdminPageShell variant="wide">
      <DetailPageSkeleton
        sectionCount={2}
        summaryCardCount={4}
        actionButtonCount={2}
        asideVariant="summary"
      />
    </AdminPageShell>
  );
}
