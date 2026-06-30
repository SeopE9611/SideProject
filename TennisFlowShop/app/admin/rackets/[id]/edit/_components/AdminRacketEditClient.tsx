"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import AdminRacketForm, { type RacketForm } from "@/app/admin/rackets/_components/AdminRacketForm";
import { ArrowLeft, Edit, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { racketBrandLabel } from "@/lib/constants";
import { UNSAVED_CHANGES_MESSAGE } from "@/lib/hooks/useUnsavedChangesGuard";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type AdminRacketDetail = RacketForm & {
  id: string;
  brand: string;
  model: string;
  quantity?: number;
};

function StockChip({ id, total }: { id: string; total: number }) {
  const { data } = useSWR<{ ok: boolean; available: number }>(
    `/api/admin/rentals/active-count/${id}`,
    authenticatedSWRFetcher,
    {
      dedupingInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const qty = Math.max(1, total ?? 1);
  const avail = Math.max(0, Number(data?.available ?? 0));
  const soldOut = avail <= 0;
  return (
    <Badge variant={soldOut ? "destructive" : "default"} className="font-normal">
      {qty > 1 ? (soldOut ? `0/${qty}` : `${avail}/${qty}`) : soldOut ? "대여 중" : "대여 가능"}
    </Badge>
  );
}

export default function AdminRacketEditClient({ id }: { id: string }) {
  const r = useRouter();
  const { data, isLoading, error } = useSWR<AdminRacketDetail>(
    `/api/admin/rackets/${id}`,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const confirmLeave = (e: React.MouseEvent) => {
    const hasUnsaved = typeof window !== "undefined" && window.history.state?.__unsaved === true;
    if (!hasUnsaved) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onSubmit = async (payload: RacketForm) => {
    await adminMutator(`/api/admin/rackets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    r.push("/admin/rackets");
  };

  const onDelete = async () => {
    try {
      await adminMutator(`/api/admin/rackets/${id}`, {
        method: "DELETE",
      });
      r.push("/admin/rackets");
    } catch (error) {
      showErrorToast(getAdminErrorMessage(error) || "삭제 실패");
    }
  };

  if (error || !data?.id) {
    if (isLoading && !data?.id) {
      return (
        <AdminPageShell variant="wide">
          <div className="space-y-6">
            <div className={cn(adminSurface.card, "space-y-4 p-6 sm:p-8")}>
              <Skeleton className="h-9 w-24" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            <div className={cn(adminSurface.card, "space-y-4 p-6")}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
              <Skeleton className="h-36 w-full" />
            </div>
          </div>
        </AdminPageShell>
      );
    }

    return (
      <AdminPageShell variant="wide">
        <div className={cn(adminSurface.card, "border-destructive p-8 text-center")}>
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">데이터를 불러오지 못했습니다.</p>
            <Link href="/admin/rackets" className="mt-4 inline-block">
              <Button variant="outline">목록으로 돌아가기</Button>
            </Link>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell variant="wide">
      <div className="space-y-6">
        <div>
            {isLoading ? (
              <div
                className={cn(
                  adminSurface.fieldPanelMuted,
                  "mb-4",
                  adminTypography.caption,
                )}
              >
                최신 정보를 확인하고 있습니다...
              </div>
            ) : null}
            <AdminPageHeader
              title="라켓 수정"
              description={`${racketBrandLabel(data.brand)} ${data.model}`}
              icon={Edit}
              actions={(
                <>
                  <StockChip id={data.id} total={data.quantity ?? 1} />
                  <Button variant="outline" type="button" asChild className="border-border">
                    <Link href="/admin/rackets" data-no-unsaved-guard onClick={confirmLeave}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      목록으로
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" type="button">
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>라켓을 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                          이 작업은 되돌릴 수 없습니다. 라켓 정보가 영구적으로 삭제됩니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            />
        </div>

        <AdminRacketForm initial={data} submitLabel="저장" onSubmit={onSubmit} />
      </div>
    </AdminPageShell>
  );
}
