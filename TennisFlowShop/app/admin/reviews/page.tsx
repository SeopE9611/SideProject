import AdminReviewListClient from "@/app/admin/reviews/_components/AdminReviewListClient";
import AdminReviewMaintenancePanel from "@/app/admin/reviews/_components/AdminReviewMaintenancePanel";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "후기 관리",
};

export default function ReviewsPage() {
  return (
    <AdminPageShell variant="wide" className="space-y-5">
      <AdminPageHeader
        title="후기 관리"
        description="상품, 교체서비스, 대여 후기를 한 곳에서 확인하고 공개 상태를 관리합니다."
        helperText="일반 후기 관리는 목록 탭에서 처리하고, 데이터 정비성 작업은 유지보수 탭에서 신중히 진행하세요."
        scope="범위: 상품·교체서비스·대여 후기"
        icon={Star}
      />

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-auto">
          <TabsTrigger value="list">목록</TabsTrigger>
          <TabsTrigger value="maintenance">유지보수</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <AdminReviewListClient />
        </TabsContent>

        <TabsContent value="maintenance">
          <AdminReviewMaintenancePanel />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
