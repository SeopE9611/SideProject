"use client";
import AdminRacketForm, { type RacketForm } from "@/app/admin/rackets/_components/AdminRacketForm";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { UNSAVED_CHANGES_MESSAGE } from "@/lib/hooks/useUnsavedChangesGuard";
import { adminMutator } from "@/lib/admin/adminFetcher";

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
    <AdminPageShell variant="wide">
      <div className="space-y-6">
        <AdminPageHeader
          title="라켓 등록"
          description="새로운 중고 라켓 정보를 입력하고 등록하세요."
          icon={Package}
          actions={
            <Button variant="outline" type="button" asChild className="border-border">
              <Link href="/admin/rackets" data-no-unsaved-guard onClick={confirmLeave}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                취소
              </Link>
            </Button>
          }
        />

        <AdminRacketForm submitLabel="저장" onSubmit={onSubmit} />
      </div>
    </AdminPageShell>
  );
}
