"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";

type BoardDetailActionsProps = {
  postId: string;
  currentStatus: "public" | "published" | "hidden" | "deleted" | string;
};

const AdminConfirmDialog = dynamic(
  () => import("@/components/admin/AdminConfirmDialog"),
  { loading: () => null },
);

export default function BoardDetailActions({
  postId,
  currentStatus,
}: BoardDetailActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<
    "publish" | "hide" | "delete" | null
  >(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const runStatusChange = async (nextStatus: "public" | "hidden") => {
    setPendingAction(nextStatus === "public" ? "publish" : "hide");
    try {
      await adminMutator<{ ok?: boolean }>(
        `/api/admin/community/posts/${encodeURIComponent(postId)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      toast.success(
        `게시물을 ${nextStatus === "public" ? "공개" : "숨김"} 처리했습니다.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(getAdminErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const runDelete = async () => {
    setPendingAction("delete");
    try {
      await adminMutator<{ ok?: boolean }>(
        `/api/admin/community/posts/${encodeURIComponent(postId)}`,
        {
          method: "DELETE",
        },
      );

      toast.success("게시물을 삭제했습니다. 목록으로 이동합니다.");
      router.push("/admin/boards");
      router.refresh();
    } catch (error) {
      toast.error(getAdminErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 관리자 전용 수정 플로우는 /admin/boards/[id]/edit 라우트로 고정한다. */}
      <Button
        variant="outline"
        asChild
        className="bg-card backdrop-blur-sm border-border hover:bg-primary/10 dark:border-border dark:hover:bg-primary/20"
      >
        <Link href={`/admin/boards/${postId}/edit`}>
          <Pencil className="mr-2 h-4 w-4" />
          수정
        </Link>
      </Button>

      {currentStatus !== "public" && currentStatus !== "published" ? (
        <Button
          disabled={pendingAction !== null}
          onClick={() => runStatusChange("public")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Eye className="mr-2 h-4 w-4" />
          {pendingAction === "publish" ? "공개 처리 중..." : "공개"}
        </Button>
      ) : (
        <Button
          disabled={pendingAction !== null}
          onClick={() => runStatusChange("hidden")}
          variant="secondary"
        >
          <EyeOff className="mr-2 h-4 w-4" />
          {pendingAction === "hide" ? "숨김 처리 중..." : "숨김"}
        </Button>
      )}

      <Button
        disabled={pendingAction !== null}
        variant="destructive"
        onClick={() => setDeleteConfirmOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {pendingAction === "delete" ? "삭제 중..." : "삭제"}
      </Button>

      <AdminConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          void runDelete();
        }}
        title="정말 삭제할까요?"
        description="삭제 후에는 게시물이 목록과 화면에서 사라질 수 있으며, 복구가 어려울 수 있습니다."
        confirmText="삭제"
        severity="danger"
        eventKey="admin-board-delete-confirm"
      />
    </div>
  );
}
