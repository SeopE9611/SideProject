import AdminReviewListClient from '@/app/admin/reviews/_components/AdminReviewListClient';
import AdminReviewMaintenancePanel from '@/app/admin/reviews/_components/AdminReviewMaintenancePanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ReviewsPage() {
  return (
    <div className="p-6">
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
