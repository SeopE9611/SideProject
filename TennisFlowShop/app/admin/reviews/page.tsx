import AdminReviewListClient from "@/app/admin/reviews/_components/AdminReviewListClient";
import AdminReviewMaintenancePanel from "@/app/admin/reviews/_components/AdminReviewMaintenancePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리뷰 관리",
};

const reviewGuideItems = [
  {
    title: "리뷰 목록 관리",
    description: "공개 상태, 상품 연결, 작성 내용을 목록에서 빠르게 확인합니다.",
  },
  {
    title: "유지보수 작업",
    description:
      "데이터 정비성 작업은 영향 범위를 확인한 뒤 유지보수 탭에서 신중히 진행하세요.",
  },
  {
    title: "신고/문제 리뷰 확인",
    description:
      "문제가 있는 리뷰는 내용과 주문·상품 연결 정보를 먼저 점검한 뒤 조치합니다.",
  },
];

export default function ReviewsPage() {
  return (
    <div className="space-y-5 p-6">
      <section className="space-y-2 rounded-lg border bg-card p-4 sm:p-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          리뷰 관리
        </h1>
        <p className="text-sm leading-relaxed break-keep text-muted-foreground">
          상품 리뷰의 공개 상태, 연결 정보, 유지보수 작업을 한 곳에서
          확인합니다.
        </p>
        <p className="text-sm leading-relaxed break-keep text-muted-foreground">
          일반 리뷰 관리는 목록 탭에서 처리하고, 데이터 정비성 작업은 유지보수
          탭에서 신중히 진행하세요.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reviewGuideItems.map((item) => (
          <div
            key={item.title}
            className="rounded-md border bg-muted/20 p-3 text-sm leading-relaxed break-keep"
          >
            <p className="font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-muted-foreground">{item.description}</p>
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
