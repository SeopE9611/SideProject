import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { CreditCard } from "lucide-react";
import PrivatePaymentsClient from "./PrivatePaymentsClient";

export default function PrivatePaymentsPage() {
  return (
    <AdminPageShell variant="wide">
      <AdminPageHeader
        title="개인결제 관리"
        description="고객별 맞춤 결제 링크를 생성하고 결제 상태를 확인합니다."
        icon={CreditCard}
      />
      <PrivatePaymentsClient />
    </AdminPageShell>
  );
}
