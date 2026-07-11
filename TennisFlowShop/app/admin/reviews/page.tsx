import AdminReviewListClient from "@/app/admin/reviews/_components/AdminReviewListClient";
import AdminReviewMaintenancePanel from "@/app/admin/reviews/_components/AdminReviewMaintenancePanel";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "후기 관리",
};

const reviewGuideItems = [
  {
    title: "후기 목록 관리",
    description: "공개 상태, 상품 연결, 작성 내용을 목록에서 빠르게 확인합니다.",
  },
  {
    title: "유지보수 작업",
    description: "데이터 정비성 작업은 영향 범위를 확인한 뒤 유지보수 탭에서 신중히 진행하세요.",
  },
  {
    title: "신고/문제 후기 확인",
    description: "문제가 있는 후기는 내용과 주문·상품 연결 정보를 먼저 점검한 뒤 조치합니다.",
  },
];

export default function ReviewsPage() {
  return (
    <div className="space-y-5 p-6">
      <AdminPageHeader
        title="후기 관리"
        description="상품, 교체서비스, 대여 후기를 한 곳에서 확인하고 공개 상태를 관리합니다."
        helperText="일반 후기 관리는 목록 탭에서 처리하고, 데이터 정비성 작업은 유지보수 탭에서 신중히 진행하세요."
        scope="범위: 상품·교체서비스·대여 후기"
        icon={Star}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reviewGuideItems.map((item) => (
          <div key={item.title} className={cn(adminSurface.cardMuted, "p-4 break-keep")}>
            <p className={adminTypography.bodyStrong}>{item.title}</p>
            <p className={cn("mt-1", adminTypography.metaMuted)}>{item.description}</p>
          </div>
        ))}
      </section>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
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
    </div>
  );
}
