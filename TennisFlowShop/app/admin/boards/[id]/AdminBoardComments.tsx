"use client";

import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type Props = { postId: string };
type CommentItem = {
  id: string;
  parentId: string | null;
  nickname: string;
  content: string;
  status: string;
};
type CommentsResponse = { ok: boolean; items: CommentItem[] };

export default function AdminBoardComments({ postId }: Props) {
  const router = useRouter();
  const { data, mutate } = useSWR<CommentsResponse>(
    `/api/admin/community/posts/${postId}/comments?page=1&limit=100`,
    authenticatedSWRFetcher,
  );

  const comments = data?.ok ? data.items : [];

  const deleteComment = async (comment: CommentItem) => {
    const label = comment.parentId ? "답글" : "댓글";
    if (!window.confirm(`이 ${label}을 삭제하시겠습니까?`)) return;
    try {
      await adminMutator(`/api/admin/community/comments/${comment.id}`, {
        method: "DELETE",
      });
      showSuccessToast(`${label}을 삭제했습니다.`);
      await mutate();
      router.refresh();
    } catch (e: any) {
      showErrorToast(e?.message ?? `${label} 삭제에 실패했습니다.`);
    }
  };

  return (
    <Card className={adminSurface.card}>
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <CardTitle className={adminTypography.sectionTitle}>댓글 관리</CardTitle>
        <p className={adminTypography.caption}>
          댓글 삭제는 즉시 반영되며 복구할 수 없습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-5 sm:p-6">
        {comments.map((comment) => (
          <div key={comment.id} className={adminSurface.cardMuted}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 p-3 pb-0">
              <div className={adminTypography.metaMuted}>
                {comment.parentId ? "답글" : "댓글"} · {comment.nickname}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={adminTypography.caption}>삭제 후 복구 불가</span>
                <Button size="sm" variant="destructive" onClick={() => deleteComment(comment)}>
                  <Trash2 className="mr-1 h-4 w-4" /> 삭제
                </Button>
              </div>
            </div>
            <p className={`${adminTypography.body} px-3 pb-3`}>{comment.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <div className={`${adminSurface.cardMuted} p-4`}>
            <p className={adminTypography.metaMuted}>댓글이 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
