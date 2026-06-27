"use client";
import AdminRacketForm, { type RacketForm } from "@/app/admin/rackets/_components/AdminRacketForm";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UNSAVED_CHANGES_MESSAGE } from "@/lib/hooks/useUnsavedChangesGuard";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { cn } from "@/lib/utils";

export default function AdminRacketNewClient() {
  const r = useRouter();

  const confirmLeave = (e: React.MouseEvent) => {
    const hasUnsaved = typeof window !== "undefined" && window.history.state?.__unsaved === true;
    if (!hasUnsaved) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onSubmit = async (data: RacketForm) => {
    await adminMutator("/api/admin/rackets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    r.push("/admin/rackets");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-6">
        <div className="space-y-6">
          <div className={cn(adminSurface.card, "p-6 sm:p-8")}>
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="bg-card rounded-full p-3 shadow-md">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className={adminTypography.pageTitle}>라켓 등록</h2>
                  <p className={adminTypography.metaMuted}>
                    새로운 중고 라켓 정보를 입력하고 등록하세요.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" type="button" asChild className="border-border">
                  <Link href="/admin/rackets" data-no-unsaved-guard onClick={confirmLeave}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    취소
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          <AdminRacketForm submitLabel="저장" onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
}
